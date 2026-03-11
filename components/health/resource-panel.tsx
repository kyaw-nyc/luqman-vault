import { cn } from "@/lib/utils";

interface ResourcePanelProps {
  title: string;
  percent: number;
  rows: { label: string; value: string }[];
}

function barColor(pct: number) {
  if (pct > 85) return "bg-red-500";
  if (pct > 65) return "bg-amber-500";
  return "bg-emerald-500/70";
}

function numColor(pct: number) {
  if (pct > 85) return "text-red-400";
  if (pct > 65) return "text-amber-400";
  return "text-emerald-400";
}

export function ResourcePanel({ title, percent, rows }: ResourcePanelProps) {
  const clamped = Math.min(Math.max(percent, 0), 100);

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-4 sm:p-6">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:mb-3 sm:text-[11px]">
        {title}
      </p>

      {/* Big percentage */}
      <p className="mb-3 leading-none sm:mb-4">
        <span
          className={cn(
            "font-mono text-[36px] font-light tabular-nums sm:text-[44px]",
            numColor(clamped),
          )}
        >
          {clamped.toFixed(1)}
        </span>
        <span className="font-mono text-[16px] text-zinc-700 sm:text-[20px]">%</span>
      </p>

      {/* Bar */}
      <div className="mb-5 h-[3px] w-full overflow-hidden rounded-full bg-zinc-800/80">
        <div
          className={cn("h-full rounded-full", barColor(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>

      {/* Sub-metrics */}
      <dl className="space-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 text-[11px] text-zinc-700">{label}</dt>
            <dd className="truncate text-right font-mono text-[12px] text-zinc-400">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
