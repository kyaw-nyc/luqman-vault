"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FolderOpen, FileX } from "lucide-react";
import type { FileItem } from "@/types/files";
import { FileIcon } from "./file-icon";
import { Lightbox } from "./lightbox";
import { formatBytes, formatRelativeTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const IMAGE_EXTS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "heic", "tiff",
]);

interface SmartViewFile extends FileItem {
  parentPath?: string;
  versionCount?: number;
}

interface Props {
  files: SmartViewFile[];
  viewType: string;
}

export function SmartViewBrowser({ files, viewType }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const isImageView = viewType === "images";
  const imageFiles = isImageView
    ? files
    : [];

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/50 py-24">
        <FileX className="mb-4 h-10 w-10 text-zinc-800" />
        <p className="text-[13px] text-zinc-600">No files match this view</p>
      </div>
    );
  }

  if (isImageView) {
    return (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {imageFiles.map((file, i) => (
            <button
              key={file.path}
              onClick={() => setLightboxIdx(i)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-800/40 bg-zinc-900/30 transition-all hover:border-zinc-700/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/download?path=${encodeURIComponent(file.path)}&inline=1`}
                alt={file.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 pb-2 pt-6">
                <p className="truncate font-mono text-[11px] text-white/90">
                  {file.name}
                </p>
                <p className="font-mono text-[10px] text-white/50">
                  {formatBytes(file.size)}
                </p>
              </div>
            </button>
          ))}
        </div>

        {lightboxIdx !== null && (
          <Lightbox
            images={imageFiles}
            currentIndex={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
            onNavigate={setLightboxIdx}
          />
        )}
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/40">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-zinc-800/40 bg-zinc-900/30">
            <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-widest text-zinc-700">
              Name
            </th>
            <th className="hidden px-4 py-3 text-right text-[11px] font-medium uppercase tracking-widest text-zinc-700 sm:table-cell">
              Size
            </th>
            <th className="hidden px-4 py-3 text-right text-[11px] font-medium uppercase tracking-widest text-zinc-700 md:table-cell">
              Modified
            </th>
            <th className="hidden px-4 py-3 text-right text-[11px] font-medium uppercase tracking-widest text-zinc-700 lg:table-cell">
              Location
            </th>
            <th className="w-10 px-2 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/30">
          {files.map((file) => {
            const parentPath = file.parentPath || file.path.substring(0, file.path.lastIndexOf("/")) || "/";
            return (
              <tr
                key={file.path}
                className="group transition-colors hover:bg-zinc-800/20"
              >
                <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <FileIcon name={file.name} isDirectory={file.isDirectory} />
                    <div className="min-w-0">
                      <span className="block truncate text-[13px] text-zinc-300">
                        {file.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-zinc-700 sm:hidden">
                        {formatBytes(file.size)}
                        {file.versionCount !== undefined && file.versionCount > 0 && (
                          <span className="text-amber-500/70">
                            · {file.versionCount}v
                          </span>
                        )}
                      </span>
                      {file.versionCount !== undefined && file.versionCount > 0 && (
                        <span className="hidden font-mono text-[10px] text-amber-500/70 sm:inline">
                          {file.versionCount} version{file.versionCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-right font-mono text-[12px] text-zinc-600 sm:table-cell">
                  {formatBytes(file.size)}
                </td>
                <td className="hidden px-4 py-3 text-right font-mono text-[12px] text-zinc-600 md:table-cell">
                  {formatRelativeTime(file.modifiedAt)}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <Link
                    href={`/files?path=${encodeURIComponent(parentPath)}`}
                    className="block truncate text-right font-mono text-[11px] text-zinc-700 transition-colors hover:text-emerald-400"
                  >
                    {parentPath}
                  </Link>
                </td>
                <td className="px-2 py-3">
                  <a
                    href={`/api/download?path=${encodeURIComponent(file.path)}`}
                    download={file.name}
                    className="inline-flex rounded-md p-2 text-zinc-700 transition-colors hover:bg-zinc-800/40 hover:text-zinc-400"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
