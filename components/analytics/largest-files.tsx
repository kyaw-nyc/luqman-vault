"use client";

import { useState } from "react";
import Link from "next/link";
import type { AnalyticsFile } from "@/types/analytics";
import { formatBytes, formatRelativeTime } from "@/lib/formatters";
import { FileIcon } from "@/components/files/file-icon";

interface Props {
  files: AnalyticsFile[];
}

function isValidFile(f: unknown): f is AnalyticsFile {
  return (
    f != null &&
    typeof (f as AnalyticsFile).name === "string" &&
    typeof (f as AnalyticsFile).path === "string"
  );
}

export function LargestFiles({ files }: Props) {
  const [showCount, setShowCount] = useState(15);
  const safe = Array.isArray(files) ? files.filter(isValidFile) : [];
  const visible = safe.slice(0, showCount);

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-4 sm:p-6">
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-widest text-zinc-600 sm:mb-4">
        Largest Files
      </h3>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-600">No files found</p>
      ) : (
        <div className="space-y-0.5">
          {visible.map((file, i) => {
            const path = file.path || "/";
            const parentPath =
              path.substring(0, path.lastIndexOf("/")) || "/";
            const size = Number(file.size) || 0;
            const modifiedAt = file.modifiedAt ?? "";
            return (
              <div
                key={file.path}
                className="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-800/30 sm:gap-3 sm:py-1.5"
              >
                <span className="w-4 shrink-0 text-right font-mono text-[10px] text-zinc-700 sm:w-5 sm:text-[11px]">
                  {i + 1}
                </span>
                <FileIcon name={file.name} isDirectory={false} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/files?path=${encodeURIComponent(parentPath)}`}
                    className="block truncate font-mono text-[12px] text-zinc-300 transition-colors group-hover:text-emerald-400 sm:text-[13px]"
                  >
                    {file.name}
                  </Link>
                  {/* Mobile: size + time inline */}
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-zinc-600 sm:hidden">
                    {formatBytes(size)} · {formatRelativeTime(modifiedAt)}
                  </span>
                  {/* Desktop: full path */}
                  <span className="hidden truncate font-mono text-[10px] text-zinc-700 sm:block">
                    {file.path}
                  </span>
                </div>
                {/* Desktop: size + time stacked right */}
                <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
                  <span className="font-mono text-[12px] text-zinc-400">
                    {formatBytes(size)}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-700">
                    {formatRelativeTime(modifiedAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {safe.length > showCount && (
        <button
          onClick={() => setShowCount((c) => c + 15)}
          className="mt-3 w-full rounded-lg py-2 text-center font-mono text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800/30 hover:text-zinc-300"
        >
          Show more ({safe.length - showCount} remaining)
        </button>
      )}
    </div>
  );
}
