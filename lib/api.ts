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
