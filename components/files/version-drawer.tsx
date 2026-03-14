"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Clock,
  RotateCcw,
  Download,
  Loader2,
  FileWarning,
  Check,
} from "lucide-react";
import type { FileVersion } from "@/types/analytics";
import { getFileVersions, restoreVersion } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Props {
  filePath: string;
  fileName: string;
  open: boolean;
  onClose: () => void;
}

export function VersionDrawer({ filePath, fileName, open, onClose }: Props) {
  const router = useRouter();
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const v = await getFileVersions(filePath);
      const valid = (Array.isArray(v) ? v : []).filter(
        (x): x is FileVersion =>
          x && typeof x.id === "string" && typeof x.createdAt === "string",
      );
      setVersions(valid.reverse());
    } catch {
      setError("Failed to load version history");
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    if (open) {
      load();
      setRestoredId(null);
    }
  }, [open, load]);

  const handleRestore = async (id: string) => {
    if (restoringId) return;
    setRestoringId(id);
    try {
      await restoreVersion(id);
      setRestoredId(id);
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch {
      setError("Restore failed");
    } finally {
      setRestoringId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-zinc-800/40 bg-[#0a0b0f]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/40 bg-[#0a0b0f] px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-zinc-600" />
              <h2 className="text-[14px] font-medium text-zinc-200">
                Version History
              </h2>
            </div>
            <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-600">
              {fileName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-800/40 hover:text-zinc-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
              <span className="text-[13px] text-zinc-600">
                Loading versions…
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <FileWarning className="h-6 w-6 text-red-400/60" />
              <span className="text-[13px] text-red-400/80">{error}</span>
              <button
                onClick={load}
                className="rounded-lg px-3 py-1.5 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
              >
                Retry
              </button>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Clock className="h-6 w-6 text-zinc-700" />
              <span className="text-[13px] text-zinc-600">
                No previous versions
              </span>
              <span className="max-w-xs text-center text-[11px] text-zinc-700">
                Versions are created automatically when a file is overwritten
                during upload.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mb-3 text-[11px] text-zinc-700">
                {versions.length} version{versions.length !== 1 ? "s" : ""} saved
                · max {5} kept per file
              </p>
              {versions.map((v, i) => (
                <div
                  key={v.id}
                  className={cn(
                    "rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-4 transition-colors",
                    restoredId === v.id && "border-emerald-500/30 bg-emerald-500/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-zinc-800/60 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
                          v{versions.length - i}
                        </span>
                        <span className="font-mono text-[12px] text-zinc-400">
                          {formatBytes(Number(v.size) || 0)}
                        </span>
                      </div>
                      <p className="mt-1.5 font-mono text-[11px] text-zinc-600">
                        {formatDate(v.createdAt ?? "")}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <a
                        href={`/api/versions/download?id=${encodeURIComponent(v.id)}`}
                        download
                        className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-800/40 hover:text-zinc-300"
                        title="Download this version"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => handleRestore(v.id)}
                        disabled={!!restoringId}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors",
                          restoredId === v.id
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200",
                        )}
                        title="Restore this version"
                      >
                        {restoringId === v.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : restoredId === v.id ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {restoredId === v.id ? "Restored" : "Restore"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div
          className="border-t border-zinc-800/40 px-5 py-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <p className="text-center text-[10px] text-zinc-700">
            Restoring a version creates a new backup of the current file first
          </p>
        </div>
      </div>
    </div>
  );
}
