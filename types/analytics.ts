export interface AnalyticsFolder {
  name: string;
  path: string;
  sizeBytes: number;
  fileCount: number;
  folderCount: number;
}

export interface AnalyticsFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
  extension: string | null;
}

export interface TypeBreakdown {
  extension: string;
  count: number;
  totalBytes: number;
}

export interface StorageAnalytics {
  totalFiles: number;
  totalFolders: number;
  totalSizeBytes: number;
  diskTotalBytes: number;
  diskUsedBytes: number;
  diskFreeBytes: number;
  folders: AnalyticsFolder[];
  largestFiles: AnalyticsFile[];
  typeBreakdown: TypeBreakdown[];
}

export interface TreeChild {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes: number;
  fileCount: number;
}

export interface StorageTree {
  path: string;
  children: TreeChild[];
}

export interface FileVersion {
  id: string;
  storedName: string;
  originalPath: string;
  size: number;
  createdAt: string;
}
