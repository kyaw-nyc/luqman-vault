import { getStats, getActivity, getHealth } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StorageCard } from "@/components/cards/storage-card";
import { ActivityCard } from "@/components/cards/activity-card";
import { HealthSummaryCard } from "@/components/cards/health-summary-card";
import { formatBytes } from "@/lib/formatters";
import { Server, HardDrive, BarChart3, ArrowDownToLine } from "lucide-react";

export default async function DashboardPage() {
  const [stats, activity, health] = await Promise.all([
    getStats(),
    getActivity(),
    getHealth(),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="System overview and recent activity"
      />

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Hostname" value={stats.hostname} icon={Server} />
        <StatCard
          label="Total Storage"
          value={formatBytes(stats.totalBytes)}
          icon={HardDrive}
        />
        <StatCard
          label="Used"
          value={formatBytes(stats.usedBytes)}
          icon={BarChart3}
        />
        <StatCard
          label="Available"
          value={formatBytes(stats.freeBytes)}
          icon={ArrowDownToLine}
          accent
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <StorageCard stats={stats} />
        <HealthSummaryCard health={health} />
      </div>

      <ActivityCard activity={activity} />
    </>
  );
}
