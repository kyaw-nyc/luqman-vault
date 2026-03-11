"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { AnalyticsFolder, TreeChild } from "@/types/analytics";
import { formatBytes } from "@/lib/formatters";
import { ChevronRight, Folder, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  folders: AnalyticsFolder[];
}

interface DrillState {
  path: string;
  children: TreeChild[];
}

export function FolderExplorer({ folders }: Props) {
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [loading, setLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

  const fetchChildren = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/storage-tree?path=${encodeURIComponent(path)}`,
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setDrill({ path, children: data.children ?? [] });
    } catch {
      setDrill(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrillDown = (path: string, name: string) => {
    setBreadcrumb((b) => [...b, name]);
    fetchChildren(path);
  };

  const handleBack = () => {
    if (breadcrumb.length <= 1) {
      setDrill(null);
      setBreadcrumb([]);
    } else {
      const newCrumbs = breadcrumb.slice(0, -1);
      setBreadcrumb(newCrumbs);
      const parentPath =
        "/" + newCrumbs.join("/") || "/";
      fetchChildren(parentPath);
    }
  };

  const totalSize = folders.reduce((s, f) => s + f.sizeBytes, 0);

  if (drill) {
    const drillTotal = drill.children.reduce((s, c) => s + c.sizeBytes, 0);
    return (
      <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={handleBack}
            className="rounded px-2 py-1 font-mono text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800/30 hover:text-zinc-300"
          >
            &larr; Back
          </button>
          <span className="font-mono text-[11px] text-zinc-600">
            /{breadcrumb.join("/")}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
          </div>
        ) : drill.children.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-600">Empty directory</p>
        ) : (
          <div className="space-y-1">
            {drill.children.map((child) => {
              const pct =
                drillTotal > 0
                  ? ((child.sizeBytes / drillTotal) * 100).toFixed(1)
                  : "0";
              return (
                <div
                  key={child.path}
                  className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-800/30"
                >
                  {child.isDirectory ? (
                    <Folder className="h-4 w-4 shrink-0 text-blue-400/70" />
                  ) : (
                    <File className="h-4 w-4 shrink-0 text-zinc-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    {child.isDirectory ? (
                      <button
                        onClick={() =>
                          handleDrillDown(child.path, child.name)
                        }
                        className="block truncate text-left font-mono text-[13px] text-zinc-300 transition-colors group-hover:text-emerald-400"
                      >
                        {child.name}
                      </button>
                    ) : (
                      <span className="block truncate font-mono text-[13px] text-zinc-400">
                        {child.name}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-baseline gap-2">
                    <span className="font-mono text-[12px] text-zinc-400">
                      {formatBytes(child.sizeBytes)}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-700">
                      {pct}%
                    </span>
                    {child.isDirectory && (
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-700 transition-colors group-hover:text-zinc-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-5 sm:p-6">
      <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-zinc-600">
        Folders
      </h3>

      {folders.length === 0 ? (
        <p className="text-sm text-zinc-600">No folders found</p>
      ) : (
        <div className="space-y-1">
          {folders.map((folder) => {
            const pct =
              totalSize > 0
                ? ((folder.sizeBytes / totalSize) * 100).toFixed(1)
                : "0";
            return (
              <div
                key={folder.path}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-800/30"
              >
                <Folder className="h-4 w-4 shrink-0 text-blue-400/70" />
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() =>
                      handleDrillDown(folder.path, folder.name)
                    }
                    className="block truncate text-left font-mono text-[13px] text-zinc-300 transition-colors group-hover:text-emerald-400"
                  >
                    {folder.name}
                  </button>
                  <span className="block font-mono text-[10px] text-zinc-700">
                    {folder.fileCount.toLocaleString()} files
                    {folder.folderCount > 0 &&
                      ` · ${folder.folderCount.toLocaleString()} folders`}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[12px] text-zinc-400">
                      {formatBytes(folder.sizeBytes)}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-700">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800/60">
                    <div
                      className="h-full rounded-full bg-emerald-500/50"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-700 transition-colors group-hover:text-zinc-400" />
              </div>
            );
          })}
        </div>
      )}

      {folders.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <Link
            href="/files"
            className="font-mono text-[11px] text-zinc-500 transition-colors hover:text-emerald-400"
          >
            Open Files &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
