import type { FileItem } from "@/types/files";
import type { StorageStats, RecentActivity } from "@/types/stats";
import type { HealthItem, SystemInfo } from "@/types/health";
import {
  mockFiles,
  mockStats,
  mockActivity,
  mockHealth,
  mockSystemInfo,
} from "./mock-data";
import { BACKEND_URL } from "./backend";

// Server-side mock toggle — does not leak to the browser
const USE_MOCK = process.env.USE_MOCK !== "false";

async function fetchApi<T>(endpoint: string, fallback: T): Promise<T> {
  if (USE_MOCK) return fallback;

  try {
    const res = await fetch(`${BACKEND_URL}${endpoint}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  } catch {
    console.warn(`API call failed for ${endpoint}, using mock data`);
    return fallback;
  }
}

export async function getFiles(path: string = "/"): Promise<FileItem[]> {
  return fetchApi(
    `/api/files?path=${encodeURIComponent(path)}`,
    mockFiles(path),
  );
}

export async function getStats(): Promise<StorageStats> {
  return fetchApi("/api/stats", mockStats);
}

export async function getActivity(): Promise<RecentActivity[]> {
  return fetchApi("/api/activity", mockActivity);
}

export async function getHealth(): Promise<HealthItem[]> {
  return fetchApi("/api/health", mockHealth);
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return fetchApi("/api/system", mockSystemInfo);
}

// ── Mutations (client-callable, same-origin proxy) ──────────────────────────

async function mutate(url: string, body: unknown, method = "POST"): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Request failed");
  }
}

export async function createFolder(parentPath: string, name: string): Promise<void> {
  return mutate("/api/mkdir", { path: parentPath, name });
}

export async function renameItem(path: string, newName: string): Promise<void> {
  return mutate("/api/rename", { path, newName });
}

export async function deleteItem(path: string): Promise<void> {
  const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Delete failed");
  }
}

export async function moveItem(fromPath: string, toPath: string): Promise<void> {
  return mutate("/api/move", { fromPath, toPath });
}

// ── Upload (client-callable, same-origin proxy) ──────────────────────────────

// Called from a client component — uses a relative URL so the browser
// never touches the backend directly.
export function uploadFile(
  file: File,
  targetPath: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("path", targetPath);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));

    xhr.open("POST", "/api/upload");
    xhr.send(form);
  });
}
