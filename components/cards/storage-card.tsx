import type { StorageStats } from "@/types/stats";
import { formatBytes } from "@/lib/formatters";
import { ProgressBar } from "@/components/ui/progress-bar";

export function StorageCard({ stats }: { stats: StorageStats }) {
  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between sm:mb-5">
        <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:text-[11px]">
          Storage Overview
        </h3>
        <span className="font-mono text-[11px] text-zinc-700">
          {stats.percentUsed.toFixed(1)}% used
        </span>
      </div>

      <ProgressBar value={stats.usedBytes} max={stats.totalBytes} />

      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-zinc-800/30 pt-5">
        <div>
          <p className="text-[11px] text-zinc-600">Total</p>
          <p className="mt-1 font-mono text-sm font-medium text-zinc-300">
            {formatBytes(stats.totalBytes)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-600">Used</p>
          <p className="mt-1 font-mono text-sm font-medium text-zinc-300">
            {formatBytes(stats.usedBytes)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-600">Free</p>
          <p className="mt-1 font-mono text-sm font-medium text-emerald-400/80">
            {formatBytes(stats.freeBytes)}
          </p>
        </div>
      </div>
    </div>
  );
}
