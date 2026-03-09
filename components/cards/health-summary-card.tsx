import type { HealthItem } from "@/types/health";
import { StatusPill } from "@/components/ui/status-pill";

export function HealthSummaryCard({ health }: { health: HealthItem[] }) {
  const allRunning = health.every((h) => h.status === "running");

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
          Services
        </h3>
        {allRunning && (
          <span className="text-[11px] font-medium text-emerald-500/70">
            All operational
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        {health.map((item) => (
          <div
            key={item.serviceName}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-800/25"
          >
            <span className="font-mono text-[13px] text-zinc-400">
              {item.serviceName}
            </span>
            <StatusPill status={item.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
