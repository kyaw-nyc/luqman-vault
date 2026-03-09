export interface StorageStats {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  percentUsed: number;
  hostname: string;
}

export interface RecentActivity {
  fileName: string;
  action: "created" | "modified" | "deleted" | "uploaded";
  path: string;
  timestamp: string;
}
