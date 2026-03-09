import type { HealthItem } from "@/types/health";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const statusBorder = {
  running: "border-l-emerald-500/40",
  stopped: "border-l-red-500/40",
  error: "border-l-red-500/40",
  unknown: "border-l-zinc-600/40",
};

export function ServiceCard({ service }: { service: HealthItem }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800/40 border-l-2 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-700/40",
        statusBorder[service.status],
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[13px] font-medium text-zinc-300">
          {service.serviceName}
        </h3>
        <StatusPill status={service.status} />
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-zinc-600">
        {service.details}
      </p>
      <p className="mt-2 font-mono text-[11px] text-zinc-800">
        last checked {formatDate(service.checkedAt)}
      </p>
    </div>
  );
}
