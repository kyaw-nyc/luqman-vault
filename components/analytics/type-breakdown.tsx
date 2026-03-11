"use client";

import { useState } from "react";
import type { TypeBreakdown as TypeBreakdownT } from "@/types/analytics";
import { formatBytes } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const BAR_COLORS = [
  "bg-emerald-500/60",
  "bg-blue-500/60",
  "bg-amber-500/60",
  "bg-purple-500/60",
  "bg-cyan-500/60",
  "bg-pink-500/60",
  "bg-orange-500/60",
  "bg-lime-500/60",
];

interface Props {
  types: TypeBreakdownT[];
}

export function TypeBreakdown({ types }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? types : types.slice(0, 10);
  const maxBytes = types.length > 0 ? types[0].totalBytes : 0;

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-4 sm:p-6">
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-widest text-zinc-600 sm:mb-4">
        File Types
      </h3>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-600">No type data available</p>
      ) : (
        <div className="space-y-2">
          {visible.map((t, i) => {
            const pct = maxBytes > 0 ? (t.totalBytes / maxBytes) * 100 : 0;
            return (
              <div key={t.extension} className="flex items-center gap-2 sm:gap-3">
                <span className="w-10 shrink-0 text-right font-mono text-[10px] text-zinc-400 sm:w-20 sm:text-[12px]">
                  .{t.extension}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-800/40 sm:h-4">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      BAR_COLORS[i % BAR_COLORS.length],
                    )}
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-[10px] text-zinc-400 sm:w-20 sm:text-[12px]">
                  {formatBytes(t.totalBytes)}
                </span>
                <span className="hidden w-16 shrink-0 text-right font-mono text-[10px] text-zinc-700 sm:inline">
                  {t.count} file{t.count !== 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {types.length > 10 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 w-full rounded-lg py-2 text-center font-mono text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800/30 hover:text-zinc-300"
        >
          {expanded ? "Show less" : `Show all ${types.length} types`}
        </button>
      )}
    </div>
  );
}
