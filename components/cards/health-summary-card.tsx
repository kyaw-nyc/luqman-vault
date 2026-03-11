import type { HealthItem } from "@/types/health";
import { StatusPill } from "@/components/ui/status-pill";

export function HealthSummaryCard({ health }: { health: HealthItem[] }) {
  const allRunning = health.every((h) => h.status === "running");

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between sm:mb-5">
        <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:text-[11px]">
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
            className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-zinc-800/25 sm:px-3 sm:py-2.5"
          >
            <span className="truncate font-mono text-[12px] text-zinc-400 sm:text-[13px]">
              {item.serviceName}
            </span>
            <StatusPill status={item.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
