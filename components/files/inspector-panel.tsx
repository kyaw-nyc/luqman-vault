"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Download,
  Pencil,
  FolderInput,
  Trash2,
  Clock,
  File,
  Folder,
  Image,
  Film,
  FileText,
} from "lucide-react";
import type { FileItem } from "@/types/files";
import type { FileVersion } from "@/types/analytics";
import { getFileVersions, getFolderSize } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/formatters";
import { FileIcon } from "./file-icon";
import { cn } from "@/lib/utils";

const IMAGE_EXTS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "heic", "tiff",
]);

interface Props {
  file: FileItem | null;
  onClose: () => void;
  onRename?: (file: FileItem) => void;
  onMove?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onVersions?: (file: FileItem) => void;
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-widest text-zinc-700">
        {label}
      </span>
      <span className="min-w-0 text-right font-mono text-[12px] text-zinc-400">
        {value}
      </span>
    </div>
  );
}

function getTypeLabel(file: FileItem): string {
  if (file.isDirectory) return "Folder";
  const ext = file.extension?.toLowerCase() ?? "";
  if (IMAGE_EXTS.has(ext)) return "Image";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "Video";
  if (["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(ext)) return "Audio";
  if (["pdf"].includes(ext)) return "PDF Document";
  if (["doc", "docx", "pages", "odt", "rtf"].includes(ext)) return "Document";
  if (["xls", "xlsx", "csv"].includes(ext)) return "Spreadsheet";
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) return "Archive";
  if (["js", "ts", "py", "go", "rs", "rb", "java", "cpp", "c", "h"].includes(ext))
    return "Source Code";
  if (["md", "txt"].includes(ext)) return "Text";
  if (["json", "yaml", "yml", "xml", "toml"].includes(ext)) return "Config";
  return file.extension ? `.${file.extension.toUpperCase()} File` : "File";
}

export function InspectorPanel({
  file,
  onClose,
  onRename,
  onMove,
  onDelete,
  onVersions,
}: Props) {
  const [versionCount, setVersionCount] = useState<number | null>(null);
  const [folderItemCount, setFolderItemCount] = useState<number | null>(null);
  const [folderSize, setFolderSize] = useState<number | null>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(
    null,
  );

  const loadMeta = useCallback(async () => {
    if (!file) return;

    setVersionCount(null);
    setFolderItemCount(null);
    setFolderSize(null);
    setImageDims(null);

    if (!file.isDirectory) {
      getFileVersions(file.path)
        .then((v) => setVersionCount(Array.isArray(v) ? v.length : 0))
        .catch(() => setVersionCount(0));

      if (file.extension && IMAGE_EXTS.has(file.extension.toLowerCase())) {
        const img = new window.Image();
        img.onload = () =>
          setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = `/api/download?path=${encodeURIComponent(file.path)}&inline=1`;
      }
    } else {
      try {
        const res = await fetch(
          `/api/files?path=${encodeURIComponent(file.path)}`,
        );
        if (res.ok) {
          const items = await res.json();
          setFolderItemCount(Array.isArray(items) ? items.length : 0);
        }
      } catch { /* ignore */ }

      getFolderSize(file.path)
        .then((sz) => setFolderSize(sz))
        .catch(() => {});
    }
  }, [file]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isOpen = file !== null;

  return (
    <>
      {/* Mobile: bottom sheet backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] sm:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel: right side on desktop, bottom sheet on mobile */}
      <aside
        className={cn(
          "fixed z-50 flex flex-col border-zinc-800/40 bg-[#0a0b0f] shadow-2xl transition-transform duration-300 ease-out",
          "sm:right-0 sm:top-0 sm:h-full sm:w-80 sm:border-l",
          isOpen ? "sm:translate-x-0" : "sm:translate-x-full",
          "max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-t-2xl max-sm:border-t max-sm:max-h-[75vh]",
          isOpen ? "max-sm:translate-y-0" : "max-sm:translate-y-full",
        )}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {file && (
          <>
            {/* Handle bar (mobile) */}
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />

            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800/40 px-5 py-4">
              <FileIcon
                name={file.name}
                isDirectory={file.isDirectory}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-zinc-200">
                  {file.name}
                </p>
                <p className="font-mono text-[11px] text-zinc-600">
                  {getTypeLabel(file)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-800/40 hover:text-zinc-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Metadata */}
            <div className="flex-1 overflow-y-auto">
              {/* Image thumbnail */}
              {!file.isDirectory &&
                file.extension &&
                IMAGE_EXTS.has(file.extension.toLowerCase()) && (
                  <div className="border-b border-zinc-800/40 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/download?path=${encodeURIComponent(file.path)}&inline=1`}
                      alt={file.name}
                      className="w-full rounded-lg object-contain"
                      style={{ maxHeight: "180px" }}
                    />
                  </div>
                )}

              <div className="divide-y divide-zinc-800/30 px-5">
                <MetaRow label="Name" value={file.name} />
                <MetaRow
                  label="Path"
                  value={
                    <span className="block truncate" title={file.path}>
                      {file.path}
                    </span>
                  }
                />
                <MetaRow label="Type" value={getTypeLabel(file)} />
                <MetaRow
                  label="Size"
                  value={
                    file.isDirectory
                      ? folderSize !== null
                        ? formatBytes(folderSize)
                        : "Calculating…"
                      : formatBytes(file.size)
                  }
                />
                <MetaRow label="Modified" value={formatDate(file.modifiedAt)} />

                {file.isDirectory && folderItemCount !== null && (
                  <MetaRow
                    label="Items"
                    value={`${folderItemCount} item${folderItemCount !== 1 ? "s" : ""}`}
                  />
                )}

                {imageDims && (
                  <MetaRow
                    label="Dimensions"
                    value={`${imageDims.w} × ${imageDims.h}`}
                  />
                )}

                {!file.isDirectory && versionCount !== null && (
                  <MetaRow
                    label="Versions"
                    value={
                      versionCount > 0
                        ? `${versionCount} saved`
                        : "None"
                    }
                  />
                )}

                {file.extension && (
                  <MetaRow
                    label="Extension"
                    value={`.${file.extension}`}
                  />
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="shrink-0 border-t border-zinc-800/40 px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                {!file.isDirectory && (
                  <a
                    href={`/api/download?path=${encodeURIComponent(file.path)}`}
                    download={file.name}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                )}
                {onRename && (
                  <button
                    onClick={() => onRename(file)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Rename
                  </button>
                )}
                {onMove && (
                  <button
                    onClick={() => onMove(file)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
                  >
                    <FolderInput className="h-3.5 w-3.5" />
                    Move
                  </button>
                )}
                {onVersions && !file.isDirectory && (
                  <button
                    onClick={() => onVersions(file)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Version History
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(file)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] text-red-400/70 transition-colors hover:bg-red-500/5 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Move to Trash
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
