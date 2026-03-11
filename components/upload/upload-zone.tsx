"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/formatters";
import { uploadFile } from "@/lib/api";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
}

const STORAGE_FOLDERS = [
  { label: "ServerSync", value: "/ServerSync" },
  { label: "School", value: "/School" },
  { label: "Projects", value: "/Projects" },
  { label: "Media", value: "/Media" },
  { label: "Backups", value: "/Backups" },
  { label: "Archive", value: "/Archive" },
];

export function UploadZone() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [targetFolder, setTargetFolder] = useState("/ServerSync");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const uploadFiles: UploadFile[] = Array.from(newFiles).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...uploadFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const runUpload = async () => {
    setIsUploading(true);
    const pending = files.filter((f) => f.status === "pending");
    let completedCount = 0;

    for (const item of pending) {
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "uploading" } : f)),
      );

      try {
        await uploadFile(item.file, targetFolder, (pct) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f)),
          );
        });
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: "complete", progress: 100 } : f,
          ),
        );
        completedCount++;
      } catch {
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "error" } : f)),
        );
      }
    }

    setIsUploading(false);

    // Navigate to the target folder so the user can see the uploaded files
    if (completedCount > 0) {
      setTimeout(() => {
        router.push(`/files?path=${encodeURIComponent(targetFolder)}`);
      }, 1800);
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="h-4 w-4 text-zinc-600" />
            <span className="text-[13px] text-zinc-500">Destination</span>
          </div>
          <select
            value={targetFolder}
            onChange={(e) => setTargetFolder(e.target.value)}
            className="rounded-md border border-zinc-800/60 bg-zinc-800/30 px-3 py-1.5 font-mono text-[13px] text-zinc-300 outline-none transition-colors focus:border-zinc-700"
          >
            {STORAGE_FOLDERS.map((folder) => (
              <option key={folder.value} value={folder.value}>
                ~{folder.value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed py-20 transition-all",
          isDragOver
            ? "border-emerald-500/40 bg-emerald-500/[0.03]"
            : "border-zinc-800/50 hover:border-zinc-700/50 hover:bg-zinc-900/20",
        )}
      >
        <div
          className={cn(
            "mb-5 flex h-14 w-14 items-center justify-center rounded-xl transition-colors",
            isDragOver ? "bg-emerald-500/10" : "bg-zinc-800/30",
          )}
        >
          <Upload
            className={cn(
              "h-6 w-6 transition-colors",
              isDragOver ? "text-emerald-400" : "text-zinc-600",
            )}
          />
        </div>
        <p
          className={cn(
            "text-[14px] font-medium transition-colors",
            isDragOver ? "text-emerald-400" : "text-zinc-400",
          )}
        >
          {isDragOver ? "Drop to add files" : "Drag & drop files"}
        </p>
        <p className="mt-1.5 text-[12px] text-zinc-700">
          or click to browse
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
              Queued ({files.length})
            </p>
            {pendingCount > 0 && (
              <button
                onClick={runUpload}
                disabled={isUploading}
                className="rounded-md bg-emerald-500/90 px-4 py-1.5 text-[13px] font-medium text-zinc-950 transition-all hover:bg-emerald-400 disabled:opacity-40"
              >
                {isUploading
                  ? "Uploading\u2026"
                  : `Upload ${pendingCount} file${pendingCount > 1 ? "s" : ""}`}
              </button>
            )}
          </div>

          <div className="divide-y divide-zinc-800/20 overflow-hidden rounded-xl border border-zinc-800/40">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800/40">
                  {uploadFile.status === "complete" ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400/80" />
                  ) : uploadFile.status === "uploading" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  ) : uploadFile.status === "error" ? (
                    <AlertCircle className="h-4 w-4 text-red-400/80" />
                  ) : (
                    <File className="h-4 w-4 text-zinc-600" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-zinc-300">
                    {uploadFile.file.name}
                  </p>
                  <p className="font-mono text-[11px] text-zinc-700">
                    {formatBytes(uploadFile.file.size)}
                  </p>
                </div>

                {uploadFile.status === "uploading" && (
                  <div className="w-24">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800/50">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-150"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {uploadFile.status === "complete" && (
                  <span className="font-mono text-[11px] text-emerald-500/70">
                    done
                  </span>
                )}

                {uploadFile.status === "error" && (
                  <span className="font-mono text-[11px] text-red-400/70">
                    failed
                  </span>
                )}

                {uploadFile.status === "pending" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(uploadFile.id);
                    }}
                    className="rounded-md p-1 text-zinc-700 transition-colors hover:bg-zinc-800/50 hover:text-zinc-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
