"use client";

import { useState } from "react";
import type { AnalyticsFolder } from "@/types/analytics";
import { formatBytes } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-lime-500",
  "bg-indigo-500",
  "bg-rose-500",
];

const DOT_COLORS = [
  "bg-emerald-400",
  "bg-blue-400",
  "bg-amber-400",
  "bg-purple-400",
  "bg-cyan-400",
  "bg-pink-400",
  "bg-orange-400",
  "bg-lime-400",
  "bg-indigo-400",
  "bg-rose-400",
];

interface Props {
  folders: AnalyticsFolder[];
  totalSizeBytes: number;
  diskTotalBytes: number;
}

export function StorageMap({ folders, totalSizeBytes, diskTotalBytes }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (folders.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-6">
        <p className="text-sm text-zinc-600">No storage data available</p>
      </div>
    );
  }

  const usedPct = diskTotalBytes > 0
    ? ((totalSizeBytes / diskTotalBytes) * 100).toFixed(1)
    : "0";

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
          Storage Map
        </h3>
        <span className="font-mono text-[12px] text-zinc-500">
          {formatBytes(totalSizeBytes)} of {formatBytes(diskTotalBytes)} used ({usedPct}%)
        </span>
      </div>

      {/* Segmented bar */}
      <div className="relative mb-5 flex h-8 w-full overflow-hidden rounded-lg bg-zinc-800/60 sm:h-10">
        {folders.map((folder, i) => {
          const pct = totalSizeBytes > 0
            ? (folder.sizeBytes / totalSizeBytes) * 100
            : 0;
          if (pct < 0.5) return null;
          return (
            <div
              key={folder.path}
              className={cn(
                "relative flex items-center justify-center overflow-hidden transition-opacity",
                COLORS[i % COLORS.length],
                hoveredIdx !== null && hoveredIdx !== i && "opacity-40",
              )}
              style={{ width: `${pct}%` }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {pct > 8 && (
                <span className="truncate px-1.5 font-mono text-[10px] font-medium text-white/90 sm:text-[11px]">
                  {folder.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {folders.map((folder, i) => {
          const pct = totalSizeBytes > 0
            ? ((folder.sizeBytes / totalSizeBytes) * 100).toFixed(1)
            : "0";
          return (
            <button
              key={folder.path}
              className={cn(
                "flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-opacity",
                hoveredIdx !== null && hoveredIdx !== i && "opacity-40",
              )}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  DOT_COLORS[i % DOT_COLORS.length],
                )}
              />
              <span className="font-mono text-[11px] text-zinc-400">
                {folder.name}
              </span>
              <span className="font-mono text-[10px] text-zinc-600">
                {pct}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
