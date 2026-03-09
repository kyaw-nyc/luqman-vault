import mimetypes
import os
import shutil
import socket
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

STORAGE_ROOT = Path("/home/luqman/Storage").resolve()
ACTIVITY_SCAN_DEPTH = 3
ACTIVITY_LIMIT = 20

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine — this is private/Tailscale only
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

# (display_name, systemctl_name)
# Ubuntu names the SSH service "ssh", not "sshd"
SERVICES = [
    ("tailscaled", "tailscaled"),
    ("smbd", "smbd"),
    ("sshd", "ssh"),
    ("ae1200-fix.service", "ae1200-fix.service"),
]


# ── Request models ──────────────────────────────────────────────────────────

class MkdirBody(BaseModel):
    path: str = "/"
    name: str

class RenameBody(BaseModel):
    path: str
    newName: str

class MoveBody(BaseModel):
    fromPath: str
    toPath: str


# ── Path safety ─────────────────────────────────────────────────────────────

def resolve_safe_path(path: str) -> Path:
    """Resolve a client path to an absolute path inside STORAGE_ROOT.
    Raises 400 if the resolved path escapes the storage root."""
    clean = Path(path.lstrip("/"))
    resolved = (STORAGE_ROOT / clean).resolve()

    if not str(resolved).startswith(str(STORAGE_ROOT)):
        raise HTTPException(status_code=400, detail="Invalid path")

    return resolved

def safe_name(name: str) -> str:
    """Validate a bare filename/folder name — no slashes, no dots-only names."""
    name = name.strip()
    if not name or "/" in name or name in (".", ".."):
        raise HTTPException(status_code=400, detail="Invalid name")
    return name


# ── Read endpoints ───────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats():
    usage = shutil.disk_usage(STORAGE_ROOT)
    percent_used = round((usage.used / usage.total) * 100, 1)
    return {
        "totalBytes": usage.total,
        "usedBytes": usage.used,
        "freeBytes": usage.free,
        "percentUsed": percent_used,
        "hostname": socket.gethostname(),
    }


@app.get("/api/health")
def get_health():
    now = datetime.now(timezone.utc).isoformat()
    result = []

    for display_name, service_name in SERVICES:
        try:
            proc = subprocess.run(
                ["systemctl", "is-active", service_name],
                capture_output=True,
                text=True,
                timeout=3,
            )
            state = proc.stdout.strip()
            if state == "active":
                status = "running"
                details = f"{display_name} is active"
            elif state in ("inactive", "dead"):
                status = "stopped"
                details = f"{display_name} is stopped"
            else:
                status = "error"
                details = f"{display_name} state: {state}"
        except Exception as e:
            status = "unknown"
            details = str(e)

        result.append({
            "serviceName": display_name,
            "status": status,
            "details": details,
            "checkedAt": now,
        })

    return result


@app.get("/api/system")
def get_system():
    uptime_seconds = float(Path("/proc/uptime").read_text().split()[0])
    days = int(uptime_seconds // 86400)
    hours = int((uptime_seconds % 86400) // 3600)
    minutes = int((uptime_seconds % 3600) // 60)
    uptime_str = f"{days}d {hours}h {minutes}m" if days > 0 else f"{hours}h {minutes}m"

    return {
        "hostname": socket.gethostname(),
        "uptime": uptime_str,
        "backendReachable": True,
    }


@app.get("/api/files")
def get_files(path: str = Query(default="/")):
    target = resolve_safe_path(path)

    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")

    items = []
    for entry in sorted(target.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower())):
        try:
            stat = entry.stat()
        except OSError:
            continue

        ext = entry.suffix.lstrip(".").lower() if entry.suffix else None
        mime = mimetypes.guess_type(entry.name)[0] if not entry.is_dir() else None
        relative = "/" + str(entry.relative_to(STORAGE_ROOT))

        items.append({
            "name": entry.name,
            "path": relative,
            "isDirectory": entry.is_dir(),
            "size": stat.st_size if not entry.is_dir() else 0,
            "modifiedAt": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
            "extension": ext,
            "mimeType": mime,
        })

    return items


@app.get("/api/activity")
def get_activity():
    items = []

    for root, dirs, files in os.walk(STORAGE_ROOT):
        depth = len(Path(root).relative_to(STORAGE_ROOT).parts)
        if depth >= ACTIVITY_SCAN_DEPTH:
            dirs.clear()  # don't recurse deeper

        for fname in files:
            fpath = Path(root) / fname
            try:
                stat = fpath.stat()
                relative = "/" + str(fpath.relative_to(STORAGE_ROOT))
                items.append({
                    "fileName": fname,
                    "action": "modified",
                    "path": relative,
                    "timestamp": datetime.fromtimestamp(
                        stat.st_mtime, tz=timezone.utc
                    ).isoformat(),
                })
            except OSError:
                continue

    items.sort(key=lambda x: x["timestamp"], reverse=True)
    return items[:ACTIVITY_LIMIT]


@app.get("/api/download")
def download_file(path: str = Query(...), inline: bool = Query(default=False)):
    target = resolve_safe_path(path)

    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if target.is_dir():
        raise HTTPException(status_code=400, detail="Cannot download a directory")

    if inline:
        mime = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        return FileResponse(path=target, media_type=mime)

    return FileResponse(path=target, filename=target.name, media_type="application/octet-stream")


@app.get("/api/preview")
def preview_file(path: str = Query(...)):
    target = resolve_safe_path(path)

    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if target.is_dir():
        raise HTTPException(status_code=400, detail="Cannot preview a directory")

    MAX_BYTES = 512 * 1024  # 512 KB
    size = target.stat().st_size
    truncated = size > MAX_BYTES

    try:
        with open(target, "r", encoding="utf-8", errors="replace") as f:
            content = f.read(MAX_BYTES)
    except Exception:
        raise HTTPException(status_code=400, detail="Cannot read file as text")

    return {"content": content, "truncated": truncated, "size": size}


# ── Write endpoints ──────────────────────────────────────────────────────────

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    path: str = Form(default="/"),
):
    target_dir = resolve_safe_path(path)

    if not target_dir.exists():
        raise HTTPException(status_code=404, detail="Target folder not found")
    if not target_dir.is_dir():
        raise HTTPException(status_code=400, detail="Target path is not a directory")

    filename = Path(file.filename or "upload").name
    if not filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    dest = target_dir / filename

    with open(dest, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)

    relative = "/" + str(dest.relative_to(STORAGE_ROOT))
    return {"path": relative, "size": dest.stat().st_size}


@app.post("/api/mkdir")
def create_dir(body: MkdirBody):
    parent = resolve_safe_path(body.path)
    name = safe_name(body.name)

    if not parent.is_dir():
        raise HTTPException(status_code=400, detail="Parent is not a directory")

    target = (parent / name).resolve()
    if not str(target).startswith(str(STORAGE_ROOT)):
        raise HTTPException(status_code=400, detail="Invalid path")
    if target.exists():
        raise HTTPException(status_code=409, detail="Already exists")

    target.mkdir()
    return {"path": "/" + str(target.relative_to(STORAGE_ROOT))}


@app.post("/api/rename")
def rename_item(body: RenameBody):
    target = resolve_safe_path(body.path)
    new_name = safe_name(body.newName)

    if not target.exists():
        raise HTTPException(status_code=404, detail="Not found")

    new_path = (target.parent / new_name).resolve()
    if not str(new_path).startswith(str(STORAGE_ROOT)):
        raise HTTPException(status_code=400, detail="Invalid path")
    if new_path.exists():
        raise HTTPException(status_code=409, detail="Already exists")

    target.rename(new_path)
    return {"path": "/" + str(new_path.relative_to(STORAGE_ROOT))}


@app.delete("/api/files")
def delete_item(path: str = Query(...)):
    target = resolve_safe_path(path)

    if not target.exists():
        raise HTTPException(status_code=404, detail="Not found")
    if target == STORAGE_ROOT:
        raise HTTPException(status_code=400, detail="Cannot delete storage root")

    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()

    return {"deleted": True}


@app.post("/api/move")
def move_item(body: MoveBody):
    src = resolve_safe_path(body.fromPath)
    dst = resolve_safe_path(body.toPath)

    if not src.exists():
        raise HTTPException(status_code=404, detail="Source not found")
    if dst.exists():
        raise HTTPException(status_code=409, detail="Destination already exists")

    shutil.move(str(src), str(dst))
    return {"path": "/" + str(dst.relative_to(STORAGE_ROOT))}
