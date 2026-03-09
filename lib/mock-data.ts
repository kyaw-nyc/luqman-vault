import type { FileItem } from "@/types/files";
import type { StorageStats, RecentActivity } from "@/types/stats";
import type { HealthItem, SystemInfo } from "@/types/health";

export const mockStats: StorageStats = {
  totalBytes: 1932735283200,
  usedBytes: 796917760000,
  freeBytes: 1135817523200,
  percentUsed: 41.2,
  hostname: "luqman-server",
};

const fileDatabase: Record<string, FileItem[]> = {
  "/": [
    { name: "ServerSync", path: "/ServerSync", isDirectory: true, size: 0, modifiedAt: "2026-03-08T14:30:00Z", extension: null, mimeType: null },
    { name: "School", path: "/School", isDirectory: true, size: 0, modifiedAt: "2026-03-05T09:15:00Z", extension: null, mimeType: null },
    { name: "Projects", path: "/Projects", isDirectory: true, size: 0, modifiedAt: "2026-03-01T16:45:00Z", extension: null, mimeType: null },
    { name: "Media", path: "/Media", isDirectory: true, size: 0, modifiedAt: "2026-02-28T11:20:00Z", extension: null, mimeType: null },
    { name: "Backups", path: "/Backups", isDirectory: true, size: 0, modifiedAt: "2026-02-20T08:00:00Z", extension: null, mimeType: null },
    { name: "Archive", path: "/Archive", isDirectory: true, size: 0, modifiedAt: "2026-01-15T13:00:00Z", extension: null, mimeType: null },
  ],
  "/ServerSync": [
    { name: "documents", path: "/ServerSync/documents", isDirectory: true, size: 0, modifiedAt: "2026-03-08T14:30:00Z", extension: null, mimeType: null },
    { name: "screenshots", path: "/ServerSync/screenshots", isDirectory: true, size: 0, modifiedAt: "2026-03-07T10:00:00Z", extension: null, mimeType: null },
    { name: "notes.md", path: "/ServerSync/notes.md", isDirectory: false, size: 4200, modifiedAt: "2026-03-08T15:45:00Z", extension: "md", mimeType: "text/markdown" },
    { name: "project-plan.pdf", path: "/ServerSync/project-plan.pdf", isDirectory: false, size: 2200000, modifiedAt: "2026-03-07T09:30:00Z", extension: "pdf", mimeType: "application/pdf" },
    { name: "config.yaml", path: "/ServerSync/config.yaml", isDirectory: false, size: 856, modifiedAt: "2026-03-05T11:20:00Z", extension: "yaml", mimeType: "text/yaml" },
    { name: "deploy-script.sh", path: "/ServerSync/deploy-script.sh", isDirectory: false, size: 1400, modifiedAt: "2026-03-03T16:10:00Z", extension: "sh", mimeType: "text/x-sh" },
    { name: "todo.txt", path: "/ServerSync/todo.txt", isDirectory: false, size: 320, modifiedAt: "2026-03-01T08:00:00Z", extension: "txt", mimeType: "text/plain" },
  ],
  "/ServerSync/documents": [
    { name: "meeting-notes.md", path: "/ServerSync/documents/meeting-notes.md", isDirectory: false, size: 3200, modifiedAt: "2026-03-08T13:00:00Z", extension: "md", mimeType: "text/markdown" },
    { name: "architecture.md", path: "/ServerSync/documents/architecture.md", isDirectory: false, size: 8500, modifiedAt: "2026-03-06T15:30:00Z", extension: "md", mimeType: "text/markdown" },
    { name: "budget.xlsx", path: "/ServerSync/documents/budget.xlsx", isDirectory: false, size: 45000, modifiedAt: "2026-02-28T09:45:00Z", extension: "xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    { name: "resume.pdf", path: "/ServerSync/documents/resume.pdf", isDirectory: false, size: 125000, modifiedAt: "2026-02-15T14:00:00Z", extension: "pdf", mimeType: "application/pdf" },
  ],
  "/ServerSync/screenshots": [
    { name: "dashboard-v1.png", path: "/ServerSync/screenshots/dashboard-v1.png", isDirectory: false, size: 850000, modifiedAt: "2026-03-07T10:15:00Z", extension: "png", mimeType: "image/png" },
    { name: "terminal-setup.png", path: "/ServerSync/screenshots/terminal-setup.png", isDirectory: false, size: 620000, modifiedAt: "2026-03-06T16:00:00Z", extension: "png", mimeType: "image/png" },
    { name: "network-diagram.jpg", path: "/ServerSync/screenshots/network-diagram.jpg", isDirectory: false, size: 340000, modifiedAt: "2026-03-05T12:30:00Z", extension: "jpg", mimeType: "image/jpeg" },
  ],
  "/Projects": [
    { name: "luqman-vault", path: "/Projects/luqman-vault", isDirectory: true, size: 0, modifiedAt: "2026-03-08T18:00:00Z", extension: null, mimeType: null },
    { name: "dotfiles", path: "/Projects/dotfiles", isDirectory: true, size: 0, modifiedAt: "2026-02-25T10:00:00Z", extension: null, mimeType: null },
    { name: "scripts", path: "/Projects/scripts", isDirectory: true, size: 0, modifiedAt: "2026-02-20T14:30:00Z", extension: null, mimeType: null },
  ],
  "/School": [
    { name: "semester-6", path: "/School/semester-6", isDirectory: true, size: 0, modifiedAt: "2026-03-05T09:15:00Z", extension: null, mimeType: null },
    { name: "research", path: "/School/research", isDirectory: true, size: 0, modifiedAt: "2026-02-20T11:00:00Z", extension: null, mimeType: null },
  ],
  "/Media": [
    { name: "wallpapers", path: "/Media/wallpapers", isDirectory: true, size: 0, modifiedAt: "2026-02-28T11:20:00Z", extension: null, mimeType: null },
    { name: "music", path: "/Media/music", isDirectory: true, size: 0, modifiedAt: "2026-02-15T09:00:00Z", extension: null, mimeType: null },
  ],
};

export function mockFiles(path: string): FileItem[] {
  const normalized = path === "" ? "/" : path;
  return fileDatabase[normalized] || [];
}

export const mockActivity: RecentActivity[] = [
  { fileName: "notes.md", action: "modified", path: "/ServerSync/notes.md", timestamp: "2026-03-09T10:30:00Z" },
  { fileName: "project-plan.pdf", action: "uploaded", path: "/ServerSync/project-plan.pdf", timestamp: "2026-03-09T08:00:00Z" },
  { fileName: "screenshots/", action: "created", path: "/ServerSync/screenshots", timestamp: "2026-03-08T14:00:00Z" },
  { fileName: "config.yaml", action: "modified", path: "/ServerSync/config.yaml", timestamp: "2026-03-06T09:00:00Z" },
  { fileName: "old-backup.tar.gz", action: "deleted", path: "/Backups/old-backup.tar.gz", timestamp: "2026-03-04T16:30:00Z" },
];

export const mockHealth: HealthItem[] = [
  { serviceName: "tailscaled", status: "running", details: "Tailscale daemon active, connected to tailnet", checkedAt: "2026-03-09T10:45:00Z" },
  { serviceName: "smbd", status: "running", details: "Samba file sharing active, 2 shares configured", checkedAt: "2026-03-09T10:45:00Z" },
  { serviceName: "sshd", status: "running", details: "OpenSSH server accepting connections on port 22", checkedAt: "2026-03-09T10:45:00Z" },
  { serviceName: "ae1200-fix.service", status: "running", details: "Wi-Fi adapter boot fix service active", checkedAt: "2026-03-09T10:45:00Z" },
];

export const mockSystemInfo: SystemInfo = {
  hostname: "luqman-server",
  uptime: "14d 6h 32m",
  backendReachable: true,
};
