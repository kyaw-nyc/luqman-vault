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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://luqman-server:3001";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

async function fetchApi<T>(endpoint: string, fallback: T): Promise<T> {
  if (USE_MOCK) return fallback;

  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
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
