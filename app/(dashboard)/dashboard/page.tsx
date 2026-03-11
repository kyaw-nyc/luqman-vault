import { getStats, getActivity, getHealth, getStorageBreakdown, getMetrics } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StorageCard } from "@/components/cards/storage-card";
import { ActivityCard } from "@/components/cards/activity-card";
import { HealthSummaryCard } from "@/components/cards/health-summary-card";
import { StorageBreakdownCard } from "@/components/cards/storage-breakdown-card";
import { AlertBanner } from "@/components/health/alert-banner";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { formatBytes } from "@/lib/formatters";
import { Server, HardDrive, BarChart3, ArrowDownToLine } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, activity, health, breakdown, metrics] = await Promise.all([
    getStats(),
    getActivity(),
    getHealth(),
    getStorageBreakdown(),
    getMetrics(),
  ]);
  const now = Date.now();

  return (
    <>
      <AlertBanner
        disk={metrics.disk}
        memory={metrics.memory}
        health={health}
      />

      <PageHeader
        title="Dashboard"
        description="System overview and recent activity"
        right={<LiveIndicator interval={30_000} serverTimestamp={now} />}
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

      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ActivityCard activity={activity} />
        <StorageBreakdownCard folders={breakdown} />
      </div>
    </>
  );
}
