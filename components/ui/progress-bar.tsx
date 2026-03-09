import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const percent = Math.round((value / max) * 100);

  const barColor =
    percent > 90
      ? "bg-red-500"
      : percent > 70
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div>
      {label && (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] text-zinc-500">{label}</span>
          <span
            className={cn(
              "font-mono text-[13px] font-medium",
              percent > 90
                ? "text-red-400"
                : percent > 70
                  ? "text-amber-400"
                  : "text-zinc-300",
            )}
          >
            {percent}%
          </span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/60">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor,
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
