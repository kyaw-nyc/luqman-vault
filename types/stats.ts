export interface StorageStats {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  percentUsed: number;
  hostname: string;
}

export interface RecentActivity {
  fileName: string;
  action: "created" | "modified" | "deleted" | "uploaded" | "downloaded" | "renamed" | "moved";
  path: string;
  timestamp: string;
}

export interface StorageFolder {
  name: string;
  path: string;
  sizeBytes: number;
  fileCount: number;
}
