"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  FolderInput,
  Trash2,
  Loader2,
} from "lucide-react";
import type { FileItem } from "@/types/files";
import { FileIcon } from "./file-icon";
import { formatBytes, formatDateCompact } from "@/lib/formatters";
import { createFolder, renameItem, deleteItem, moveItem } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";

type ActiveDialog =
  | { type: "mkdir" }
  | { type: "rename"; target: FileItem }
  | { type: "delete"; target: FileItem }
  | { type: "move"; target: FileItem }
  | null;

export function FileBrowser({
  files,
  currentPath,
}: {
  files: FileItem[];
  currentPath: string;
}) {
  const router = useRouter();
  const [localFiles, setLocalFiles] = useState<FileItem[]>(files);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [inputValue, setInputValue] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync local list when server re-renders with fresh data
  useEffect(() => {
    setLocalFiles(files);
  }, [files]);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handler = () => setOpenMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenu]);

  function openDialog(dialog: ActiveDialog, prefill = "") {
    setActiveDialog(dialog);
    setInputValue(prefill);
    setError(null);
    setOpenMenu(null);
  }

  function closeDialog() {
    setActiveDialog(null);
    setInputValue("");
    setError(null);
    setIsLoading(false);
  }

  async function handleMkdir() {
    if (!inputValue.trim()) return;
    setIsLoading(true);
    try {
      await createFolder(currentPath, inputValue.trim());
      router.refresh();
      closeDialog();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setIsLoading(false);
    }
  }

  async function handleRename() {
    if (activeDialog?.type !== "rename" || !inputValue.trim()) return;
    setIsLoading(true);
    try {
      await renameItem(activeDialog.target.path, inputValue.trim());
      router.refresh();
      closeDialog();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (activeDialog?.type !== "delete") return;
    const target = activeDialog.target;
    // Optimistic remove
    setLocalFiles((prev) => prev.filter((f) => f.path !== target.path));
    closeDialog();
    try {
      await deleteItem(target.path);
      router.refresh();
    } catch (e) {
      setLocalFiles(files); // restore on failure
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleMove() {
    if (activeDialog?.type !== "move" || !inputValue.trim()) return;
    const target = activeDialog.target;
    const destFolder = inputValue.trim().replace(/\/$/, "");
    const toPath = `${destFolder}/${target.name}`;
    setIsLoading(true);
    // Optimistic remove
    setLocalFiles((prev) => prev.filter((f) => f.path !== target.path));
    closeDialog();
    try {
      await moveItem(target.path, toPath);
      router.refresh();
    } catch (e) {
      setLocalFiles(files); // restore on failure
      setError(e instanceof Error ? e.message : "Move failed");
    }
  }

  const sorted = [...localFiles].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  const dirCount = sorted.filter((f) => f.isDirectory).length;
  const fileCount = sorted.length - dirCount;

  return (
    <>
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[11px] text-zinc-700">
          {dirCount > 0 && `${dirCount} folder${dirCount !== 1 ? "s" : ""}`}
          {dirCount > 0 && fileCount > 0 && "  ·  "}
          {fileCount > 0 && `${fileCount} file${fileCount !== 1 ? "s" : ""}`}
          {sorted.length === 0 && "empty"}
        </p>
        <button
          onClick={() => openDialog({ type: "mkdir" })}
          className="flex items-center gap-2 rounded-md border border-zinc-800/50 bg-zinc-900/40 px-3 py-1.5 text-[12px] text-zinc-500 transition-all hover:border-zinc-700/60 hover:text-zinc-300"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          New folder
        </button>
      </div>

      {/* File table */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/50 py-24">
          <FolderOpen className="mb-4 h-10 w-10 text-zinc-800" />
          <p className="text-[13px] text-zinc-600">This folder is empty</p>
          {currentPath !== "/" && (
            <Link
              href="/files"
              className="mt-3 text-[13px] text-emerald-500/70 transition-colors hover:text-emerald-400"
            >
              Back to root
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800/40">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/40 bg-zinc-900/30">
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 max-sm:hidden">
                  Size
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 max-sm:hidden">
                  Modified
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 max-sm:hidden">
                  Type
                </th>
                <th className="w-24 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/20">
              {sorted.map((file) => (
                <tr
                  key={file.path}
                  className="group relative transition-colors hover:bg-zinc-800/15"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <FileIcon name={file.name} isDirectory={file.isDirectory} />
                      {file.isDirectory ? (
                        <Link
                          href={`/files?path=${encodeURIComponent(file.path)}`}
                          className="text-[13px] font-medium text-zinc-200 transition-colors hover:text-emerald-400"
                        >
                          {file.name}
                        </Link>
                      ) : (
                        <span className="text-[13px] text-zinc-400">
                          {file.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-zinc-600 max-sm:hidden">
                    {file.isDirectory ? "—" : formatBytes(file.size)}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-zinc-600 max-sm:hidden">
                    {formatDateCompact(file.modifiedAt)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-zinc-600 max-sm:hidden">
                    {file.isDirectory ? "dir" : (file.extension?.toLowerCase() || "—")}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {/* Download — files only */}
                      {!file.isDirectory && (
                        <a
                          href={`/api/download?path=${encodeURIComponent(file.path)}`}
                          download={file.name}
                          className="inline-flex rounded-md p-1.5 text-zinc-700 transition-colors hover:bg-zinc-800/50 hover:text-zinc-400"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}

                      {/* Actions menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu(openMenu === file.path ? null : file.path);
                          }}
                          className="inline-flex rounded-md p-1.5 text-zinc-700 transition-colors hover:bg-zinc-800/50 hover:text-zinc-400"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>

                        {openMenu === file.path && (
                          <div
                            className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-zinc-800/60 bg-[#0d0e13] py-1 shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() =>
                                openDialog(
                                  { type: "rename", target: file },
                                  file.name,
                                )
                              }
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Rename
                            </button>
                            <button
                              onClick={() =>
                                openDialog({ type: "move", target: file })
                              }
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
                            >
                              <FolderInput className="h-3.5 w-3.5" />
                              Move to
                            </button>
                            <div className="my-1 border-t border-zinc-800/40" />
                            <button
                              onClick={() =>
                                openDialog({ type: "delete", target: file })
                              }
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-red-400/80 transition-colors hover:bg-red-500/5 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}

      {/* New folder */}
      <Dialog
        open={activeDialog?.type === "mkdir"}
        onClose={closeDialog}
        title="New folder"
      >
        <input
          autoFocus
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleMkdir()}
          placeholder="Folder name"
          className="w-full rounded-md border border-zinc-800/60 bg-zinc-800/30 px-3 py-2 font-mono text-[13px] text-zinc-200 outline-none placeholder:text-zinc-700 transition-colors focus:border-zinc-600"
        />
        {error && (
          <p className="mt-2 text-[12px] text-red-400">{error}</p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={closeDialog} className="px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300">
            Cancel
          </button>
          <button
            onClick={handleMkdir}
            disabled={isLoading || !inputValue.trim()}
            className="flex items-center gap-2 rounded-md bg-emerald-500/90 px-4 py-1.5 text-[13px] font-medium text-zinc-950 transition-all hover:bg-emerald-400 disabled:opacity-40"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create
          </button>
        </div>
      </Dialog>

      {/* Rename */}
      <Dialog
        open={activeDialog?.type === "rename"}
        onClose={closeDialog}
        title="Rename"
      >
        <p className="mb-3 font-mono text-[11px] text-zinc-600">
          {activeDialog?.type === "rename" && activeDialog.target.path}
        </p>
        <input
          autoFocus
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
          onFocus={(e) => {
            // Select name without extension for files
            if (activeDialog?.type === "rename" && !activeDialog.target.isDirectory) {
              const ext = activeDialog.target.extension;
              const end = ext ? e.target.value.length - ext.length - 1 : e.target.value.length;
              e.target.setSelectionRange(0, end);
            } else {
              e.target.select();
            }
          }}
          className="w-full rounded-md border border-zinc-800/60 bg-zinc-800/30 px-3 py-2 font-mono text-[13px] text-zinc-200 outline-none placeholder:text-zinc-700 transition-colors focus:border-zinc-600"
        />
        {error && (
          <p className="mt-2 text-[12px] text-red-400">{error}</p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={closeDialog} className="px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300">
            Cancel
          </button>
          <button
            onClick={handleRename}
            disabled={isLoading || !inputValue.trim()}
            className="flex items-center gap-2 rounded-md bg-emerald-500/90 px-4 py-1.5 text-[13px] font-medium text-zinc-950 transition-all hover:bg-emerald-400 disabled:opacity-40"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Rename
          </button>
        </div>
      </Dialog>

      {/* Delete */}
      <Dialog
        open={activeDialog?.type === "delete"}
        onClose={closeDialog}
        title="Delete"
      >
        <p className="text-[13px] text-zinc-400">
          Delete{" "}
          <span className="font-mono text-zinc-300">
            {activeDialog?.type === "delete" && activeDialog.target.name}
          </span>
          {activeDialog?.type === "delete" && activeDialog.target.isDirectory
            ? " and all its contents"
            : ""}
          ? This cannot be undone.
        </p>
        {error && (
          <p className="mt-2 text-[12px] text-red-400">{error}</p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={closeDialog} className="px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md bg-red-500/80 px-4 py-1.5 text-[13px] font-medium text-white transition-all hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </Dialog>

      {/* Move */}
      <Dialog
        open={activeDialog?.type === "move"}
        onClose={closeDialog}
        title="Move to"
      >
        <p className="mb-3 font-mono text-[11px] text-zinc-600">
          {activeDialog?.type === "move" && activeDialog.target.name}
        </p>
        <label className="mb-1.5 block text-[11px] uppercase tracking-widest text-zinc-600">
          Destination folder
        </label>
        <input
          autoFocus
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleMove()}
          placeholder="/School"
          className="w-full rounded-md border border-zinc-800/60 bg-zinc-800/30 px-3 py-2 font-mono text-[13px] text-zinc-200 outline-none placeholder:text-zinc-700 transition-colors focus:border-zinc-600"
        />
        {error && (
          <p className="mt-2 text-[12px] text-red-400">{error}</p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={closeDialog} className="px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300">
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={isLoading || !inputValue.trim()}
            className="flex items-center gap-2 rounded-md bg-emerald-500/90 px-4 py-1.5 text-[13px] font-medium text-zinc-950 transition-all hover:bg-emerald-400 disabled:opacity-40"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Move
          </button>
        </div>
      </Dialog>
    </>
  );
}
