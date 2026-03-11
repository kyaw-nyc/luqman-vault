import asyncio
import fcntl
import json
import mimetypes
import os
import platform
import pty
import select
import shutil
import signal
import socket
import sqlite3
import struct
import subprocess
import termios
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

import psutil

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

STORAGE_ROOT = Path("/home/luqman/Storage").resolve()
VAULT_DIR    = STORAGE_ROOT / ".vault"
DB_PATH      = VAULT_DIR / "activity.db"
TRASH_DIR    = STORAGE_ROOT / ".Trash"
TRASH_META   = TRASH_DIR / "metadata.json"
_trash_lock  = threading.Lock()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine — this is private/Tailscale only
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

SERVICES = [
    ("tailscaled",             "tailscaled"),
    ("smbd",                   "smbd"),
    ("sshd",                   "ssh"),
    ("ae1200-fix.service",     "ae1200-fix.service"),
    ("luqman-vault",           "luqman-vault"),
    ("luqman-vault-frontend",  "luqman-vault-frontend"),
]

# Strict whitelist for log viewer and service restart — never allow arbitrary names
SERVICE_WHITELIST = {
    "tailscaled",
    "smbd",
    "ssh",
    "sshd",
    "ae1200-fix.service",
    "luqman-vault",
    "luqman-vault-frontend",
}

# Only these line counts are accepted to prevent abuse
LOG_LINES_ALLOWED = {50, 100, 200}


# ── Activity log (SQLite) ────────────────────────────────────────────────────

def init_db() -> None:
    VAULT_DIR.mkdir(exist_ok=True)
    with sqlite3.connect(DB_PATH) as con:
        con.execute("PRAGMA journal_mode=WAL")
        con.execute("""
            CREATE TABLE IF NOT EXISTS activity (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                action    TEXT NOT NULL,
                file_name TEXT NOT NULL,
                path      TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)

def log_activity(action: str, file_name: str, path: str) -> None:
    try:
        with sqlite3.connect(DB_PATH) as con:
            con.execute(
                "INSERT INTO activity (action, file_name, path, timestamp) VALUES (?, ?, ?, ?)",
                (action, file_name, path, datetime.now(timezone.utc).isoformat()),
            )
    except Exception:
        pass  # logging must never break the main operation

init_db()


# ── Request models ────────────────────────────────────────────────────────────

class MkdirBody(BaseModel):
    path: str = "/"
    name: str

class RenameBody(BaseModel):
    path: str
    newName: str

class MoveBody(BaseModel):
    fromPath: str
    toPath: str

class TrashRestoreBody(BaseModel):
    id: str

class BulkDeleteBody(BaseModel):
    paths: list[str]

class BulkMoveBody(BaseModel):
    paths: list[str]
    destination: str

class ServiceActionBody(BaseModel):
    service: str


# ── Trash helpers ─────────────────────────────────────────────────────────────

def _ensure_trash() -> None:
    TRASH_DIR.mkdir(exist_ok=True)
    if not TRASH_META.exists():
        TRASH_META.write_text(json.dumps({"items": []}))

def _read_trash() -> dict:
    _ensure_trash()
    return json.loads(TRASH_META.read_text())

def _write_trash(data: dict) -> None:
    TRASH_META.write_text(json.dumps(data, indent=2))

def _move_to_trash(target: Path) -> dict:
    """Move target into .Trash and record metadata. Returns the trash item dict."""
    _ensure_trash()
    item_id   = uuid.uuid4().hex[:8]
    name      = target.name
    trashed   = f"{item_id}_{name}"
    dest      = TRASH_DIR / trashed
    size      = target.stat().st_size if target.is_file() else 0
    is_dir    = target.is_dir()
    rel_path  = "/" + str(target.relative_to(STORAGE_ROOT))

    shutil.move(str(target), str(dest))

    item = {
        "id":           item_id,
        "name":         name,
        "originalPath": rel_path,
        "trashedName":  trashed,
        "trashedAt":    datetime.now(timezone.utc).isoformat(),
        "isDirectory":  is_dir,
        "size":         size,
    }
    with _trash_lock:
        meta = _read_trash()
        meta["items"].append(item)
        _write_trash(meta)
    return item


# ── Path safety ───────────────────────────────────────────────────────────────

def resolve_safe_path(path: str) -> Path:
    clean = Path(path.lstrip("/"))
    resolved = (STORAGE_ROOT / clean).resolve()
    if not str(resolved).startswith(str(STORAGE_ROOT)):
        raise HTTPException(status_code=400, detail="Invalid path")
    return resolved

def safe_name(name: str) -> str:
    name = name.strip()
    if not name or "/" in name or name in (".", ".."):
        raise HTTPException(status_code=400, detail="Invalid name")
    return name


# ── Read endpoints ────────────────────────────────────────────────────────────

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
                capture_output=True, text=True, timeout=3,
            )
            state = proc.stdout.strip()
            if state == "active":
                status, details = "running", f"{display_name} is active"
            elif state in ("inactive", "dead"):
                status, details = "stopped", f"{display_name} is stopped"
            else:
                status, details = "error", f"{display_name} state: {state}"
        except Exception as e:
            status, details = "unknown", str(e)
        result.append({"serviceName": display_name, "status": status,
                        "details": details, "checkedAt": now})
    return result


@app.get("/api/logs")
def get_service_logs(
    service: str = Query(...),
    lines: str = Query("100"),
):
    if service not in SERVICE_WHITELIST:
        raise HTTPException(
            status_code=400,
            detail=f"Service '{service}' is not in the allowed whitelist",
        )

    if lines == "boot":
        cmd = ["journalctl", "-u", service, "--boot", "--no-pager", "--output=short-iso"]
    else:
        try:
            n = int(lines)
        except ValueError:
            n = 100
        if n not in LOG_LINES_ALLOWED:
            n = 100
        cmd = ["journalctl", "-u", service, "-n", str(n), "--no-pager", "--output=short-iso"]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        log = result.stdout or result.stderr or ""
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Log fetch timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "service":   service,
        "lines":     lines,
        "log":       log.strip(),
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/service/restart")
def service_restart(body: ServiceActionBody):
    if body.service not in SERVICE_WHITELIST:
        raise HTTPException(
            status_code=400,
            detail=f"Service '{body.service}' is not in the allowed whitelist",
        )
    try:
        result = subprocess.run(
            ["sudo", "systemctl", "restart", body.service],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=result.stderr.strip() or f"Failed to restart {body.service}",
            )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Restart timed out")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True, "service": body.service}


@app.get("/api/system")
def get_system():
    uptime_seconds = float(Path("/proc/uptime").read_text().split()[0])
    days = int(uptime_seconds // 86400)
    hours = int((uptime_seconds % 86400) // 3600)
    minutes = int((uptime_seconds % 3600) // 60)
    uptime_str = f"{days}d {hours}h {minutes}m" if days > 0 else f"{hours}h {minutes}m"
    return {"hostname": socket.gethostname(), "uptime": uptime_str, "backendReachable": True}


@app.get("/api/files")
def get_files(path: str = Query(default="/")):
    target = resolve_safe_path(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")

    items = []
    for entry in sorted(target.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower())):
        # Skip all hidden entries (.vault, .Trash, dotfiles)
        if entry.name.startswith("."):
            continue
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
    try:
        with sqlite3.connect(DB_PATH) as con:
            rows = con.execute(
                "SELECT action, file_name, path, timestamp FROM activity "
                "ORDER BY id DESC LIMIT 30"
            ).fetchall()
        return [
            {"action": r[0], "fileName": r[1], "path": r[2], "timestamp": r[3]}
            for r in rows
        ]
    except Exception:
        return []


@app.get("/api/storage-breakdown")
def storage_breakdown():
    result = []
    try:
        for entry in sorted(STORAGE_ROOT.iterdir(), key=lambda e: e.name.lower()):
            if not entry.is_dir() or entry.name.startswith("."):
                continue
            total_size = 0
            file_count = 0
            for root, _dirs, files in os.walk(entry):
                for fname in files:
                    try:
                        total_size += (Path(root) / fname).stat().st_size
                    except OSError:
                        pass
                file_count += len(files)
            result.append({
                "name": entry.name,
                "path": "/" + entry.name,
                "sizeBytes": total_size,
                "fileCount": file_count,
            })
    except OSError:
        pass
    result.sort(key=lambda x: x["sizeBytes"], reverse=True)
    return result


@app.get("/api/metrics")
def get_metrics():
    now = datetime.now(timezone.utc)

    # ── CPU ──────────────────────────────────────────────────────────────────
    cpu_pct = round(psutil.cpu_percent(interval=0.1), 1)
    cpu_cores = psutil.cpu_count(logical=True) or 1
    try:
        load_1m, load_5m, load_15m = os.getloadavg()
    except AttributeError:
        load_1m = load_5m = load_15m = 0.0

    # ── Memory ───────────────────────────────────────────────────────────────
    mem = psutil.virtual_memory()

    # ── Disk ─────────────────────────────────────────────────────────────────
    disk = shutil.disk_usage(STORAGE_ROOT)
    disk_pct = round((disk.used / disk.total) * 100, 1) if disk.total > 0 else 0.0

    # ── Uptime ───────────────────────────────────────────────────────────────
    uptime_secs = float(Path("/proc/uptime").read_text().split()[0])
    days  = int(uptime_secs // 86400)
    hours = int((uptime_secs % 86400) // 3600)
    mins  = int((uptime_secs % 3600) // 60)
    uptime_str = f"{days}d {hours}h {mins}m" if days > 0 else f"{hours}h {mins}m"

    # ── OS / kernel ───────────────────────────────────────────────────────────
    uname = platform.uname()

    # ── Top processes (via ps for realistic CPU snapshots) ───────────────────
    top_by_cpu: list[dict] = []
    top_by_mem: list[dict] = []
    try:
        ps = subprocess.run(
            ["ps", "-eo", "pid,comm,%cpu,%mem", "--sort=-%cpu", "--no-header"],
            capture_output=True, text=True, timeout=5,
        )
        procs = []
        for line in ps.stdout.strip().splitlines()[:30]:
            parts = line.split()
            if len(parts) >= 4:
                try:
                    procs.append({
                        "pid":           int(parts[0]),
                        "name":          parts[1][:24],
                        "cpuPercent":    float(parts[2]),
                        "memoryPercent": float(parts[3]),
                    })
                except (ValueError, IndexError):
                    pass
        top_by_cpu = procs[:5]
        top_by_mem = sorted(procs, key=lambda p: p["memoryPercent"], reverse=True)[:5]
    except Exception:
        pass

    # ── Network ───────────────────────────────────────────────────────────────
    primary_iface: str | None = None
    local_ip:      str | None = None
    tailscale_ip:  str | None = None
    try:
        for iface, addrs in psutil.net_if_addrs().items():
            if iface in ("lo",) or iface.startswith(("tailscale", "docker", "br-", "veth")):
                continue
            for addr in addrs:
                if addr.family == socket.AF_INET:
                    primary_iface = iface
                    local_ip = addr.address
                    break
            if primary_iface:
                break
        ts_addrs = psutil.net_if_addrs().get("tailscale0", [])
        for addr in ts_addrs:
            if addr.family == socket.AF_INET:
                tailscale_ip = addr.address
                break
    except Exception:
        pass

    # ── Temperature ───────────────────────────────────────────────────────────
    temp_available = False
    temp_value: float | None = None
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            all_temps = [s.current for sl in temps.values() for s in sl
                         if s.current is not None]
            if all_temps:
                temp_available = True
                temp_value = round(max(all_temps), 1)
    except (AttributeError, Exception):
        pass

    return {
        "cpu": {
            "percent":    cpu_pct,
            "loadAvg1m":  round(load_1m,  2),
            "loadAvg5m":  round(load_5m,  2),
            "loadAvg15m": round(load_15m, 2),
            "cores":      cpu_cores,
        },
        "memory": {
            "totalBytes":     mem.total,
            "usedBytes":      mem.used,
            "freeBytes":      mem.free,
            "availableBytes": mem.available,
            "percentUsed":    round(mem.percent, 1),
        },
        "disk": {
            "totalBytes":  disk.total,
            "usedBytes":   disk.used,
            "freeBytes":   disk.free,
            "percentUsed": disk_pct,
        },
        "uptime":     uptime_str,
        "hostname":   socket.gethostname(),
        "serverTime": now.isoformat(),
        "os": {
            "system": uname.system,
            "kernel": uname.release,
        },
        "topByCpu":    top_by_cpu,
        "topByMemory": top_by_mem,
        "network": {
            "primaryInterface": primary_iface,
            "localIp":          local_ip,
            "tailscaleIp":      tailscale_ip,
        },
        "temperature": {
            "available": temp_available,
            "value":     temp_value,
        },
    }


@app.get("/api/search")
def search_files(query: str = Query(...), basePath: str = Query(default="/")):
    base = resolve_safe_path(basePath)
    if not base.exists() or not base.is_dir():
        raise HTTPException(status_code=400, detail="Not a directory")

    q = query.lower().strip()
    if not q:
        return []

    results = []
    for root, dirs, files in os.walk(base):
        # Never descend into hidden directories
        dirs[:] = [d for d in dirs if not d.startswith(".")]

        root_path = Path(root)
        try:
            parent_rel = "/" + str(root_path.relative_to(STORAGE_ROOT))
        except ValueError:
            continue

        for d in list(dirs):
            if q in d.lower():
                entry = root_path / d
                try:
                    stat = entry.stat()
                except OSError:
                    continue
                rel = "/" + str(entry.relative_to(STORAGE_ROOT))
                results.append({
                    "name": d,
                    "path": rel,
                    "isDirectory": True,
                    "size": 0,
                    "modifiedAt": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                    "extension": None,
                    "mimeType": None,
                    "parentPath": parent_rel,
                })

        for f in files:
            if q in f.lower():
                entry = root_path / f
                try:
                    stat = entry.stat()
                except OSError:
                    continue
                rel = "/" + str(entry.relative_to(STORAGE_ROOT))
                ext = entry.suffix.lstrip(".").lower() if entry.suffix else None
                mime = mimetypes.guess_type(f)[0]
                results.append({
                    "name": f,
                    "path": rel,
                    "isDirectory": False,
                    "size": stat.st_size,
                    "modifiedAt": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                    "extension": ext,
                    "mimeType": mime,
                    "parentPath": parent_rel,
                })

        if len(results) >= 200:
            break

    return results


@app.get("/api/folder-size")
def get_folder_size(path: str = Query(...)):
    target = resolve_safe_path(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Not found")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Not a directory")

    total = 0
    for root, _dirs, files in os.walk(target):
        for f in files:
            try:
                total += (Path(root) / f).stat().st_size
            except OSError:
                pass
    return {"sizeBytes": total}


@app.get("/api/preview")
def preview_file(path: str = Query(...)):
    target = resolve_safe_path(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if target.is_dir():
        raise HTTPException(status_code=400, detail="Cannot preview a directory")

    MAX_BYTES = 512 * 1024
    size = target.stat().st_size
    truncated = size > MAX_BYTES
    try:
        with open(target, "r", encoding="utf-8", errors="replace") as f:
            content = f.read(MAX_BYTES)
    except Exception:
        raise HTTPException(status_code=400, detail="Cannot read file as text")
    return {"content": content, "truncated": truncated, "size": size}


@app.get("/api/download")
def download_file(path: str = Query(...), inline: bool = Query(default=False)):
    target = resolve_safe_path(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if target.is_dir():
        raise HTTPException(status_code=400, detail="Cannot download a directory")

    if not inline:
        log_activity("downloaded", target.name, "/" + str(target.relative_to(STORAGE_ROOT)))
        return FileResponse(path=target, filename=target.name, media_type="application/octet-stream")

    mime = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
    return FileResponse(path=target, media_type=mime)


# ── Write endpoints ───────────────────────────────────────────────────────────

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
    log_activity("uploaded", filename, relative)
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
    relative = "/" + str(target.relative_to(STORAGE_ROOT))
    log_activity("created", name, relative)
    return {"path": relative}


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
    relative = "/" + str(new_path.relative_to(STORAGE_ROOT))
    log_activity("renamed", new_name, relative)
    return {"path": relative}


@app.delete("/api/files")
def delete_item(path: str = Query(...)):
    target = resolve_safe_path(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Not found")
    if target == STORAGE_ROOT:
        raise HTTPException(status_code=400, detail="Cannot delete storage root")
    # Guard: never move the trash or vault dirs themselves
    if target in (TRASH_DIR, VAULT_DIR):
        raise HTTPException(status_code=400, detail="Cannot delete system directory")

    item = _move_to_trash(target)
    log_activity("deleted", item["name"], item["originalPath"])
    return {"deleted": True, "trashed": True}


# ── Trash endpoints ───────────────────────────────────────────────────────────

@app.get("/api/trash")
def get_trash():
    meta = _read_trash()
    # Filter out items whose trash file no longer exists (orphaned records)
    valid = [i for i in meta["items"] if (TRASH_DIR / i["trashedName"]).exists()]
    if len(valid) != len(meta["items"]):
        with _trash_lock:
            meta["items"] = valid
            _write_trash(meta)
    return {"items": valid}


@app.post("/api/trash/restore")
def restore_from_trash(body: TrashRestoreBody):
    with _trash_lock:
        meta = _read_trash()
        item = next((i for i in meta["items"] if i["id"] == body.id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Trash item not found")

        trash_path   = TRASH_DIR / item["trashedName"]
        restore_path = resolve_safe_path(item["originalPath"])

        # Ensure destination parent exists
        restore_path.parent.mkdir(parents=True, exist_ok=True)

        # Handle name conflict at restore location
        if restore_path.exists():
            stem = restore_path.stem
            suffix = restore_path.suffix
            restore_path = restore_path.parent / f"{stem}_restored{suffix}"

        shutil.move(str(trash_path), str(restore_path))
        meta["items"] = [i for i in meta["items"] if i["id"] != body.id]
        _write_trash(meta)

    log_activity("modified", item["name"], "/" + str(restore_path.relative_to(STORAGE_ROOT)))
    return {"ok": True, "restoredTo": "/" + str(restore_path.relative_to(STORAGE_ROOT))}


@app.delete("/api/trash/item")
def permanent_delete(item_id: str = Query(...)):
    with _trash_lock:
        meta = _read_trash()
        item = next((i for i in meta["items"] if i["id"] == item_id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Not found")

        trash_path = TRASH_DIR / item["trashedName"]
        if trash_path.is_dir():
            shutil.rmtree(trash_path)
        elif trash_path.exists():
            trash_path.unlink()

        meta["items"] = [i for i in meta["items"] if i["id"] != item_id]
        _write_trash(meta)

    return {"ok": True}


@app.delete("/api/trash/empty")
def empty_trash():
    with _trash_lock:
        meta = _read_trash()
        for item in meta["items"]:
            p = TRASH_DIR / item["trashedName"]
            if p.is_dir():
                shutil.rmtree(p)
            elif p.exists():
                p.unlink()
        meta["items"] = []
        _write_trash(meta)
    return {"ok": True}


# ── Bulk endpoints ────────────────────────────────────────────────────────────

@app.post("/api/bulk-delete")
def bulk_delete(body: BulkDeleteBody):
    results = []
    for path in body.paths:
        try:
            target = resolve_safe_path(path)
            if not target.exists():
                raise FileNotFoundError("Not found")
            item = _move_to_trash(target)
            log_activity("deleted", item["name"], item["originalPath"])
            results.append({"path": path, "ok": True})
        except Exception as e:
            results.append({"path": path, "ok": False, "error": str(e)})
    return {"results": results}


@app.post("/api/bulk-move")
def bulk_move(body: BulkMoveBody):
    dest_abs = resolve_safe_path(body.destination)
    if not dest_abs.is_dir():
        raise HTTPException(status_code=400, detail="Destination is not a directory")

    results = []
    for path in body.paths:
        try:
            src = resolve_safe_path(path)
            if not src.exists():
                raise FileNotFoundError("Not found")
            dst = dest_abs / src.name
            if dst.exists():
                raise FileExistsError(f"{src.name} already exists at destination")
            shutil.move(str(src), str(dst))
            rel = "/" + str(dst.relative_to(STORAGE_ROOT))
            log_activity("moved", src.name, rel)
            results.append({"path": path, "ok": True})
        except Exception as e:
            results.append({"path": path, "ok": False, "error": str(e)})
    return {"results": results}


@app.post("/api/move")
def move_item(body: MoveBody):
    src = resolve_safe_path(body.fromPath)
    dst = resolve_safe_path(body.toPath)
    if not src.exists():
        raise HTTPException(status_code=404, detail="Source not found")
    if dst.exists():
        raise HTTPException(status_code=409, detail="Destination already exists")

    shutil.move(str(src), str(dst))
    relative = "/" + str(dst.relative_to(STORAGE_ROOT))
    log_activity("moved", dst.name, relative)
    return {"path": relative}


# ── WebSocket Terminal ─────────────────────────────────────────────────────────

TERMINAL_IDLE_TIMEOUT = 15 * 60  # 15 minutes


def _cleanup_pty(pid: int, fd: int) -> None:
    """Close PTY fd and ensure the child process is reaped."""
    try:
        os.close(fd)
    except OSError:
        pass
    try:
        os.kill(pid, signal.SIGTERM)
    except (ProcessLookupError, OSError):
        return
    # Give SIGTERM a brief window, then force-kill
    for _ in range(5):
        try:
            rpid, _ = os.waitpid(pid, os.WNOHANG)
            if rpid != 0:
                return
        except ChildProcessError:
            return
        import time
        time.sleep(0.05)
    try:
        os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
    except Exception:
        pass


@app.websocket("/ws/terminal")
async def terminal_ws(ws: WebSocket):
    await ws.accept()
    print("[terminal] session started")

    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(str(STORAGE_ROOT))
        os.environ["TERM"] = "xterm-256color"
        os.environ["COLORTERM"] = "truecolor"
        os.execvp("/bin/bash", ["/bin/bash", "--login"])

    # Verify the child didn't exit immediately (e.g. bad .bashrc)
    try:
        rpid, _ = os.waitpid(pid, os.WNOHANG)
        if rpid != 0:
            print("[terminal] shell exited immediately")
            os.close(fd)
            await ws.close(code=4001, reason="Shell exited immediately")
            return
    except ChildProcessError:
        os.close(fd)
        await ws.close(code=4001, reason="Shell failed to start")
        return

    winsize = struct.pack("HHHH", 24, 80, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

    stop = asyncio.Event()
    last_activity = asyncio.get_event_loop().time()

    async def pty_to_ws():
        """Poll PTY for output and relay to WebSocket."""
        while not stop.is_set():
            await asyncio.sleep(0.01)
            try:
                if select.select([fd], [], [], 0)[0]:
                    data = os.read(fd, 4096)
                    if data:
                        await ws.send_bytes(data)
                    else:
                        break
            except OSError:
                break
        if not stop.is_set():
            stop.set()
            print("[terminal] shell exited")
            try:
                await ws.close(code=4001, reason="Shell exited")
            except Exception:
                pass

    async def idle_watchdog():
        nonlocal last_activity
        while not stop.is_set():
            await asyncio.sleep(30)
            now = asyncio.get_event_loop().time()
            if now - last_activity > TERMINAL_IDLE_TIMEOUT:
                stop.set()
                print("[terminal] idle timeout")
                try:
                    await ws.close(code=4000, reason="Inactivity timeout")
                except Exception:
                    pass
                break

    reader = asyncio.create_task(pty_to_ws())
    watchdog = asyncio.create_task(idle_watchdog())

    try:
        while not stop.is_set():
            msg = await ws.receive()
            last_activity = asyncio.get_event_loop().time()
            if "bytes" in msg:
                os.write(fd, msg["bytes"])
            elif "text" in msg:
                text = msg["text"]
                if text.startswith("\x01resize:"):
                    try:
                        payload = json.loads(text[8:])
                        ws_sz = struct.pack(
                            "HHHH", payload["rows"], payload["cols"], 0, 0
                        )
                        fcntl.ioctl(fd, termios.TIOCSWINSZ, ws_sz)
                    except Exception:
                        pass
                else:
                    os.write(fd, text.encode())
    except WebSocketDisconnect:
        print("[terminal] client disconnected")
    except Exception as e:
        print(f"[terminal] error: {e}")
    finally:
        stop.set()
        reader.cancel()
        watchdog.cancel()
        _cleanup_pty(pid, fd)
        print("[terminal] session cleaned up")
