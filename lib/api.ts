import type { FileItem, SearchResult, TrashItem } from "@/types/files";
import type { StorageStats, RecentActivity, StorageFolder } from "@/types/stats";
import type { HealthItem, SystemInfo } from "@/types/health";
import type { SystemMetrics } from "@/types/metrics";
import type { StorageAnalytics, FileVersion } from "@/types/analytics";
import {
  mockFiles,
  mockStats,
  mockActivity,
  mockHealth,
  mockSystemInfo,
  mockStorageBreakdown,
  mockGetMetrics,
  mockStorageAnalytics,
} from "./mock-data";
import { BACKEND_URL } from "./backend";

// Mock mode is opt-in: set USE_MOCK=true in .env.local for local dev only.
const USE_MOCK = process.env.USE_MOCK === "true";

async function fetchApi<T>(
  endpoint: string,
  fallback: T,
  options?: RequestInit,
): Promise<T> {
  if (USE_MOCK) return fallback;

  const res = await fetch(`${BACKEND_URL}${endpoint}`, options);
  if (!res.ok) throw new Error(`API ${endpoint}: ${res.status}`);
  return res.json();
}

const NO_STORE = { cache: "no-store" } satisfies RequestInit;

export async function getFiles(path: string = "/"): Promise<FileItem[]> {
  return fetchApi(
    `/api/files?path=${encodeURIComponent(path)}`,
    mockFiles(path),
    NO_STORE,
  );
}

export async function getStats(): Promise<StorageStats> {
  return fetchApi("/api/stats", mockStats, NO_STORE);
}

export async function getActivity(): Promise<RecentActivity[]> {
  return fetchApi("/api/activity", mockActivity, NO_STORE);
}

export async function getHealth(): Promise<HealthItem[]> {
  return fetchApi("/api/health", mockHealth, NO_STORE);
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return fetchApi("/api/system", mockSystemInfo, NO_STORE);
}

export async function getStorageBreakdown(): Promise<StorageFolder[]> {
  return fetchApi("/api/storage-breakdown", mockStorageBreakdown, NO_STORE);
}

export async function getMetrics(): Promise<SystemMetrics> {
  return fetchApi("/api/metrics", mockGetMetrics(), { cache: "no-store" });
}

// ── Client-side search + folder size (same-origin proxy) ────────────────────

export async function searchFiles(
  query: string,
  basePath: string = "/",
): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `/api/search?query=${encodeURIComponent(query)}&basePath=${encodeURIComponent(basePath)}`,
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getFolderSize(path: string): Promise<number> {
  const res = await fetch(
    `/api/folder-size?path=${encodeURIComponent(path)}`,
  );
  if (!res.ok) throw new Error("Failed to get folder size");
  const data = await res.json();
  return data.sizeBytes as number;
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

// ── Trash ─────────────────────────────────────────────────────────────────────
// Server-side version (uses BACKEND_URL directly, called from page.tsx)
export async function getTrash(): Promise<TrashItem[]> {
  return fetchApi("/api/trash", { items: [] }, NO_STORE).then(
    (d) => (d as { items: TrashItem[] }).items,
  );
}

// Client-side mutations (same-origin proxy)

export async function restoreTrashItem(id: string): Promise<void> {
  return mutate("/api/trash/restore", { id });
}

export async function permanentDeleteTrashItem(id: string): Promise<void> {
  const res = await fetch(`/api/trash/item?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Delete failed");
  }
}

export async function emptyTrash(): Promise<void> {
  const res = await fetch("/api/trash/empty", { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Failed to empty trash");
  }
}

// ── Bulk operations (client-callable, same-origin proxy) ─────────────────────

export async function bulkDelete(paths: string[]): Promise<void> {
  return mutate("/api/bulk-delete", { paths });
}

export async function bulkMove(paths: string[], destination: string): Promise<void> {
  return mutate("/api/bulk-move", { paths, destination });
}

// ── Service logs & restart (client-callable, same-origin proxy) ──────────────

export interface ServiceLogResult {
  service: string;
  lines: string;
  log: string;
  fetchedAt: string;
}

export async function fetchServiceLogs(
  service: string,
  lines: string = "100",
): Promise<ServiceLogResult> {
  const res = await fetch(
    `/api/logs?service=${encodeURIComponent(service)}&lines=${encodeURIComponent(lines)}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Failed to fetch logs");
  }
  return res.json();
}

export async function restartService(service: string): Promise<void> {
  return mutate("/api/service/restart", { service });
}

// ── Upload (client-callable, same-origin proxy) ──────────────────────────────

// ── Storage analytics (server-side) ──────────────────────────────────────────

export async function getStorageAnalytics(): Promise<StorageAnalytics> {
  return fetchApi("/api/storage-analytics", mockStorageAnalytics, NO_STORE);
}

// ── Version history (client-side, same-origin proxy) ─────────────────────────

export async function getFileVersions(
  path: string,
): Promise<FileVersion[]> {
  try {
    const res = await fetch(
      `/api/versions?path=${encodeURIComponent(path)}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.versions ?? [];
  } catch {
    return [];
  }
}

export async function restoreVersion(id: string): Promise<void> {
  return mutate("/api/versions/restore", { id });
}

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
