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
  const [drillError, setDrillError] = useState<string | null>(null);

  const fetchChildren = useCallback(async (path: string) => {
    setLoading(true);
    setDrillError(null);
    try {
      const res = await fetch(
        `/api/storage-tree?path=${encodeURIComponent(path)}`,
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const children = Array.isArray(data?.children)
        ? data.children.filter(
            (c: unknown) =>
              c &&
              typeof (c as { path?: unknown }).path === "string" &&
              typeof (c as { name?: unknown }).name === "string",
          )
        : [];
      setDrill({ path, children });
    } catch {
      setDrill({ path, children: [] });
      setDrillError("Failed to load folder contents");
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

  const totalSize = folders.reduce(
    (s, f) => s + (Number(f.sizeBytes) || 0),
    0,
  );

  if (drill) {
    const drillTotal = drill.children.reduce(
      (s, c) => s + (Number((c as { sizeBytes?: unknown }).sizeBytes) || 0),
      0,
    );
    return (
      <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <button
            onClick={handleBack}
            className="rounded px-2 py-1 font-mono text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800/30 hover:text-zinc-300"
          >
            &larr; Back
          </button>
          <span className="min-w-0 truncate font-mono text-[11px] text-zinc-600">
            /{breadcrumb.join("/")}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
          </div>
        ) : drillError ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-red-400/80">{drillError}</p>
            <button
              onClick={() => fetchChildren(drill.path)}
              className="rounded-lg px-3 py-1.5 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
            >
              Retry
            </button>
          </div>
        ) : drill.children.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-600">Empty directory</p>
        ) : (
          <div className="space-y-0.5">
            {drill.children.map((child) => {
              const sizeBytes = Number((child as { sizeBytes?: unknown }).sizeBytes) || 0;
              const pct =
                drillTotal > 0
                  ? ((sizeBytes / drillTotal) * 100).toFixed(1)
                  : "0";
              return (
                <div
                  key={child.path}
                  className="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-800/30 sm:gap-3 sm:py-1.5"
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
                        className="block max-w-full truncate text-left font-mono text-[12px] text-zinc-300 transition-colors group-hover:text-emerald-400 sm:text-[13px]"
                      >
                        {child.name}
                      </button>
                    ) : (
                      <span className="block truncate font-mono text-[12px] text-zinc-400 sm:text-[13px]">
                        {child.name}
                      </span>
                    )}
                    {/* Mobile: show size inline below name */}
                    <span className="mt-0.5 block font-mono text-[10px] text-zinc-600 sm:hidden">
                      {formatBytes(sizeBytes)} · {pct}%
                    </span>
                  </div>
                  {/* Desktop: size + pct + chevron */}
                  <div className="hidden shrink-0 items-baseline gap-2 sm:flex">
                    <span className="font-mono text-[12px] text-zinc-400">
                      {formatBytes(sizeBytes)}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-700">
                      {pct}%
                    </span>
                    {child.isDirectory && (
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-700 transition-colors group-hover:text-zinc-400" />
                    )}
                  </div>
                  {/* Mobile: just chevron for folders */}
                  {child.isDirectory && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-700 sm:hidden" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-4 sm:p-6">
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-widest text-zinc-600 sm:mb-4">
        Folders
      </h3>

      {folders.length === 0 ? (
        <p className="text-sm text-zinc-600">No folders found</p>
      ) : (
        <div className="space-y-0.5">
          {folders.map((folder) => {
            const sizeBytes = Number(folder.sizeBytes) || 0;
            const pct =
              totalSize > 0
                ? ((sizeBytes / totalSize) * 100).toFixed(1)
                : "0";
            const fileCount = Number(folder.fileCount) || 0;
            const folderCount = Number(folder.folderCount) || 0;
            return (
              <div
                key={folder.path}
                className="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-800/30 sm:gap-3 sm:py-1.5"
              >
                <Folder className="h-4 w-4 shrink-0 text-blue-400/70" />
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() =>
                      handleDrillDown(folder.path, folder.name)
                    }
                    className="block max-w-full truncate text-left font-mono text-[12px] text-zinc-300 transition-colors group-hover:text-emerald-400 sm:text-[13px]"
                  >
                    {folder.name}
                  </button>
                  {/* Mobile: size + counts inline */}
                  <span className="mt-0.5 block font-mono text-[10px] text-zinc-600 sm:hidden">
                    {formatBytes(sizeBytes)} · {pct}% · {fileCount.toLocaleString()} files
                  </span>
                  {/* Desktop: file/folder counts */}
                  <span className="hidden font-mono text-[10px] text-zinc-700 sm:block">
                    {fileCount.toLocaleString()} files
                    {folderCount > 0 &&
                      ` · ${folderCount.toLocaleString()} folders`}
                  </span>
                </div>
                {/* Desktop: size + bar + pct + chevron */}
                <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[12px] text-zinc-400">
                      {formatBytes(sizeBytes)}
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
        <div className="mt-3 flex items-center gap-3 sm:mt-4">
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
