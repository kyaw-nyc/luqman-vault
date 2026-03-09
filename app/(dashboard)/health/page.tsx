import { getHealth, getSystemInfo, getStats } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { ServiceCard } from "@/components/health/service-card";
import { StatCard } from "@/components/ui/stat-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Server, Clock, Wifi } from "lucide-react";

export default async function HealthPage() {
  const [health, system, stats] = await Promise.all([
    getHealth(),
    getSystemInfo(),
    getStats(),
  ]);

  return (
    <>
      <PageHeader
        title="System Health"
        description="Server services and resource monitoring"
      />

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Hostname" value={system.hostname} icon={Server} />
        <StatCard label="Uptime" value={system.uptime} icon={Clock} />
        <StatCard
          label="Backend"
          value={system.backendReachable ? "Reachable" : "Unreachable"}
          icon={Wifi}
          accent={system.backendReachable}
        />
      </div>

      <div className="mb-8 rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
            Disk Usage
          </h3>
          <span className="font-mono text-[11px] text-zinc-700">
            {stats.percentUsed.toFixed(1)}% used
          </span>
        </div>
        <ProgressBar value={stats.usedBytes} max={stats.totalBytes} />
      </div>

      <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-zinc-600">
        Services
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {health.map((service) => (
          <ServiceCard key={service.serviceName} service={service} />
        ))}
      </div>
    </>
  );
}
