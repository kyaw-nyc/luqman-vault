import Link from "next/link";
import type { StorageFolder } from "@/types/stats";
import { formatBytes } from "@/lib/formatters";

export function StorageBreakdownCard({ folders }: { folders: StorageFolder[] }) {
  if (folders.length === 0) return null;

  const max = folders[0].sizeBytes; // already sorted descending

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-4 sm:p-6">
      <h3 className="mb-4 text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:mb-5 sm:text-[11px]">
        Storage by Folder
      </h3>

      <div className="space-y-3">
        {folders.map((folder) => {
          const pct = max > 0 ? (folder.sizeBytes / max) * 100 : 0;
          return (
            <div key={folder.path}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 sm:gap-4">
                <Link
                  href={`/files?path=${encodeURIComponent(folder.path)}`}
                  className="min-w-0 truncate font-mono text-[12px] text-zinc-300 transition-colors hover:text-emerald-400 sm:text-[13px]"
                >
                  {folder.name}
                </Link>
                <div className="flex shrink-0 items-baseline gap-2 sm:gap-3">
                  <span className="font-mono text-[11px] text-zinc-400 sm:text-[12px]">
                    {formatBytes(folder.sizeBytes)}
                  </span>
                  <span className="hidden font-mono text-[11px] text-zinc-700 sm:inline">
                    {folder.fileCount.toLocaleString()} file{folder.fileCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800/60">
                <div
                  className="h-full rounded-full bg-emerald-500/50 transition-all"
                  style={{ width: `${pct.toFixed(1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
