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

  const summaryCards = [
    {
      label: "Total Files",
      value: analytics.totalFiles.toLocaleString(),
      icon: Files,
    },
    {
      label: "Total Folders",
      value: analytics.totalFolders.toLocaleString(),
      icon: FolderOpen,
    },
    {
      label: "Storage Used",
      value: formatBytes(analytics.totalSizeBytes),
      icon: Database,
    },
    {
      label: "Disk Free",
      value: formatBytes(analytics.diskFreeBytes),
      icon: HardDrive,
    },
  ];

  return (
    <>
      <PageHeader
        title="Storage Analytics"
        description="Real-time storage breakdown and usage insights"
        right={<LiveIndicator serverTimestamp={Date.now()} />}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-4 sm:p-5"
          >
            <div className="mb-2 flex items-center gap-2">
              <card.icon className="h-3.5 w-3.5 text-zinc-600" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                {card.label}
              </span>
            </div>
            <span className="font-mono text-lg font-semibold text-zinc-200 sm:text-xl">
              {card.value}
            </span>
          </div>
        ))}
      </div>

      {/* Storage map */}
      <div className="mt-4 sm:mt-6">
        <StorageMap
          folders={analytics.folders}
          totalSizeBytes={analytics.totalSizeBytes}
          diskTotalBytes={analytics.diskTotalBytes}
        />
      </div>

      {/* Folder explorer + Largest files */}
      <div className="mt-4 grid gap-4 sm:mt-6 lg:grid-cols-2">
        <FolderExplorer folders={analytics.folders} />
        <LargestFiles files={analytics.largestFiles} />
      </div>

      {/* Type breakdown */}
      <div className="mt-4 sm:mt-6">
        <TypeBreakdown types={analytics.typeBreakdown} />
      </div>
    </>
  );
}
