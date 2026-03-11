"use client";

import { useState } from "react";
import Link from "next/link";
import type { AnalyticsFile } from "@/types/analytics";
import { formatBytes, formatRelativeTime } from "@/lib/formatters";
import { FileIcon } from "@/components/files/file-icon";

interface Props {
  files: AnalyticsFile[];
}

export function LargestFiles({ files }: Props) {
  const [showCount, setShowCount] = useState(15);
  const visible = files.slice(0, showCount);

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-5 sm:p-6">
      <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-zinc-600">
        Largest Files
      </h3>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-600">No files found</p>
      ) : (
        <div className="space-y-1">
          {visible.map((file, i) => {
            const parentPath = file.path.substring(
              0,
              file.path.lastIndexOf("/"),
            ) || "/";
            return (
              <div
                key={file.path}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-800/30"
              >
                <span className="w-5 text-right font-mono text-[11px] text-zinc-700">
                  {i + 1}
                </span>
                <FileIcon name={file.name} isDirectory={false} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/files?path=${encodeURIComponent(parentPath)}`}
                    className="block truncate font-mono text-[13px] text-zinc-300 transition-colors group-hover:text-emerald-400"
                  >
                    {file.name}
                  </Link>
                  <span className="block truncate font-mono text-[10px] text-zinc-700">
                    {file.path}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="font-mono text-[12px] text-zinc-400">
                    {formatBytes(file.size)}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-700">
                    {formatRelativeTime(file.modifiedAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {files.length > showCount && (
        <button
          onClick={() => setShowCount((c) => c + 15)}
          className="mt-3 w-full rounded-lg py-2 text-center font-mono text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800/30 hover:text-zinc-300"
        >
          Show more ({files.length - showCount} remaining)
        </button>
      )}
    </div>
  );
}
