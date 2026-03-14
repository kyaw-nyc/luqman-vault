import { getStorageAnalytics, getStats } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { formatBytes } from "@/lib/formatters";
import {
  HardDrive,
  Files,
  FolderOpen,
  Database,
} from "lucide-react";
import { StorageMap } from "@/components/analytics/storage-map";
import { LargestFiles } from "@/components/analytics/largest-files";
import { TypeBreakdown } from "@/components/analytics/type-breakdown";
import { FolderExplorer } from "@/components/analytics/folder-explorer";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [analytics, stats] = await Promise.all([
    getStorageAnalytics(),
    getStats(),
  ]);

  const folders = Array.isArray(analytics.folders) ? analytics.folders : [];
  const largestFiles = Array.isArray(analytics.largestFiles) ? analytics.largestFiles : [];
  const typeBreakdown = Array.isArray(analytics.typeBreakdown) ? analytics.typeBreakdown : [];
  const totalFiles = Number(analytics.totalFiles) || 0;
  const totalFolders = Number(analytics.totalFolders) || 0;
  const totalSizeBytes = Number(analytics.totalSizeBytes) || 0;
  const diskTotalBytes = Number(analytics.diskTotalBytes) || 0;
  const diskFreeBytes = Number(analytics.diskFreeBytes) || 0;

  const summaryCards = [
    {
      label: "Total Files",
      value: totalFiles.toLocaleString(),
      icon: Files,
    },
    {
      label: "Total Folders",
      value: totalFolders.toLocaleString(),
      icon: FolderOpen,
    },
    {
      label: "Storage Used",
      value: formatBytes(totalSizeBytes),
      icon: Database,
    },
    {
      label: "Disk Free",
      value: formatBytes(diskFreeBytes),
      icon: HardDrive,
    },
  ];

  return (
    <>
      <PageHeader
        title="Storage Analytics"
        description="Real-time storage breakdown and usage insights"
        right={<LiveIndicator interval={60_000} serverTimestamp={Date.now()} />}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-3 sm:p-5"
          >
            <div className="mb-1.5 flex items-center gap-1.5 sm:mb-2 sm:gap-2">
              <card.icon className="h-3 w-3 text-zinc-600 sm:h-3.5 sm:w-3.5" />
              <span className="text-[9px] font-medium uppercase tracking-widest text-zinc-600 sm:text-[10px]">
                {card.label}
              </span>
            </div>
            <span className="truncate font-mono text-[15px] font-semibold text-zinc-200 sm:text-xl">
              {card.value}
            </span>
          </div>
        ))}
      </div>

      {/* Storage map */}
      <div className="mt-4 sm:mt-6">
        <StorageMap
          folders={folders}
          totalSizeBytes={totalSizeBytes}
          diskTotalBytes={diskTotalBytes}
        />
      </div>

      {/* Folder explorer + Largest files */}
      <div className="mt-4 grid gap-4 sm:mt-6 lg:grid-cols-2">
        <FolderExplorer folders={folders} />
        <LargestFiles files={largestFiles} />
      </div>

      {/* Type breakdown */}
      <div className="mt-4 sm:mt-6">
        <TypeBreakdown types={typeBreakdown} />
      </div>
    </>
  );
}
