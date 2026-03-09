import shutil
import socket
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

STORAGE_ROOT = "/home/luqman/Storage"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine — this is private/Tailscale only
    allow_methods=["GET"],
    allow_headers=["*"],
)


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
