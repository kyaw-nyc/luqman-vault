"use client";

import { useState, useEffect, useMemo } from "react";
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
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
} from "lucide-react";
import type { FileItem } from "@/types/files";
import { FileIcon } from "./file-icon";
import { FilePreview } from "./file-preview";
import { formatBytes, formatDateCompact } from "@/lib/formatters";
import { createFolder, renameItem, deleteItem, moveItem } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";

// ── Types ────────────────────────────────────────────────────────────────────

type ActiveDialog =
  | { type: "mkdir" }
  | { type: "rename"; target: FileItem }
  | { type: "delete"; target: FileItem }
  | { type: "move"; target: FileItem }
  | null;

type SortKey = "name" | "size" | "modified";
type SortDir = "asc" | "desc";

// ── Component ────────────────────────────────────────────────────────────────

export function FileBrowser({
  files,
  currentPath,
}: {
  files: FileItem[];
  currentPath: string;
}) {
  const router = useRouter();

  // File list state
  const [localFiles, setLocalFiles] = useState<FileItem[]>(files);

  // Preview state
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // Search / sort / filter state
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [extFilter, setExtFilter] = useState("all");

  // Dialog state
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [inputValue, setInputValue] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync local list when server re-renders after a mutation
  useEffect(() => {
    setLocalFiles(files);
  }, [files]);

  // Reset filters when navigating to a new folder
  useEffect(() => {
    setQuery("");
    setExtFilter("all");
    setSortKey("name");
    setSortDir("asc");
  }, [currentPath]);

  // Close action menu on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handler = () => setOpenMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenu]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const extensions = useMemo(() => {
    const exts = localFiles
      .filter((f) => !f.isDirectory && f.extension)
      .map((f) => f.extension!.toLowerCase());
    return [...new Set(exts)].sort();
  }, [localFiles]);

  const displayed = useMemo(() => {
    const filtered = localFiles.filter((f) => {
      const nameMatch =
        !query || f.name.toLowerCase().includes(query.toLowerCase());
      const extMatch =
        extFilter === "all" ||
        (!f.isDirectory && f.extension?.toLowerCase() === extFilter);
      return nameMatch && extMatch;
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === "name") {
        // Directories always first for name sort
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        const cmp = a.name.localeCompare(b.name);
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortKey === "size") {
        const cmp = a.size - b.size;
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortKey === "modified") {
        const cmp =
          new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
        return sortDir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }, [localFiles, query, extFilter, sortKey, sortDir]);

  const dirCount = localFiles.filter((f) => f.isDirectory).length;
  const fileCount = localFiles.length - dirCount;

  // ── Sort helpers ──────────────────────────────────────────────────────────

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-emerald-400" />
    ) : (
      <ArrowDown className="h-3 w-3 text-emerald-400" />
    );
  }

  // ── Dialog helpers ────────────────────────────────────────────────────────

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

  // ── Mutations ─────────────────────────────────────────────────────────────

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
    setLocalFiles((prev) => prev.filter((f) => f.path !== target.path));
    closeDialog();
    try {
      await deleteItem(target.path);
      router.refresh();
    } catch (e) {
      setLocalFiles(files);
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleMove() {
    if (activeDialog?.type !== "move" || !inputValue.trim()) return;
    const target = activeDialog.target;
    const destFolder = inputValue.trim().replace(/\/+$/, "");
    const toPath = `${destFolder}/${target.name}`;
    setLocalFiles((prev) => prev.filter((f) => f.path !== target.path));
    closeDialog();
    try {
      await moveItem(target.path, toPath);
      router.refresh();
    } catch (e) {
      setLocalFiles(files);
      setError(e instanceof Error ? e.message : "Move failed");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="mb-3 space-y-2">
        {/* Search row */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-700" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            className="w-full rounded-lg border border-zinc-800/50 bg-zinc-900/40 py-2 pl-9 pr-4 text-[13px] text-zinc-300 outline-none placeholder:text-zinc-700 transition-colors focus:border-zinc-700/60"
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Sort key */}
            <div className="relative">
              <select
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value as SortKey);
                  setSortDir("asc");
                }}
                className="appearance-none rounded-md border border-zinc-800/50 bg-zinc-900/40 py-1.5 pl-3 pr-7 text-[12px] text-zinc-400 outline-none transition-colors hover:border-zinc-700/60 focus:border-zinc-700/60"
              >
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="modified">Modified</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-700" />
            </div>

            {/* Sort direction toggle */}
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="rounded-md border border-zinc-800/50 bg-zinc-900/40 p-1.5 text-zinc-600 transition-colors hover:border-zinc-700/60 hover:text-zinc-400"
              title={sortDir === "asc" ? "Ascending" : "Descending"}
            >
              <SortIcon col={sortKey} />
            </button>

            {/* Extension filter */}
            {extensions.length > 0 && (
              <div className="relative">
                <select
                  value={extFilter}
                  onChange={(e) => setExtFilter(e.target.value)}
                  className="appearance-none rounded-md border border-zinc-800/50 bg-zinc-900/40 py-1.5 pl-3 pr-7 text-[12px] text-zinc-400 outline-none transition-colors hover:border-zinc-700/60 focus:border-zinc-700/60"
                >
                  <option value="all">All types</option>
                  {extensions.map((ext) => (
                    <option key={ext} value={ext}>
                      .{ext}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-700" />
              </div>
            )}

            {/* Result count hint */}
            <span className="font-mono text-[11px] text-zinc-700">
              {query || extFilter !== "all"
                ? `${displayed.length} result${displayed.length !== 1 ? "s" : ""}`
                : `${dirCount > 0 ? `${dirCount} folder${dirCount !== 1 ? "s" : ""}` : ""}${dirCount > 0 && fileCount > 0 ? "  ·  " : ""}${fileCount > 0 ? `${fileCount} file${fileCount !== 1 ? "s" : ""}` : ""}`}
            </span>
          </div>

          {/* New folder */}
          <button
            onClick={() => openDialog({ type: "mkdir" })}
            className="flex items-center gap-2 rounded-md border border-zinc-800/50 bg-zinc-900/40 px-3 py-1.5 text-[12px] text-zinc-500 transition-all hover:border-zinc-700/60 hover:text-zinc-300"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New folder
          </button>
        </div>
      </div>

      {/* ── File table ────────────────────────────────────────────────────── */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/50 py-24">
          <FolderOpen className="mb-4 h-10 w-10 text-zinc-800" />
          <p className="text-[13px] text-zinc-600">
            {query || extFilter !== "all" ? "No matching files" : "This folder is empty"}
          </p>
          {currentPath !== "/" && !query && extFilter === "all" && (
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
                <th
                  className="cursor-pointer px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 transition-colors hover:text-zinc-400"
                  onClick={() => toggleSort("name")}
                >
                  <span className="flex items-center gap-1.5">
                    Name <SortIcon col="name" />
                  </span>
                </th>
                <th
                  className="cursor-pointer px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 transition-colors hover:text-zinc-400 max-sm:hidden"
                  onClick={() => toggleSort("size")}
                >
                  <span className="flex items-center gap-1.5">
                    Size <SortIcon col="size" />
                  </span>
                </th>
                <th
                  className="cursor-pointer px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 transition-colors hover:text-zinc-400 max-sm:hidden"
                  onClick={() => toggleSort("modified")}
                >
                  <span className="flex items-center gap-1.5">
                    Modified <SortIcon col="modified" />
                  </span>
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 max-sm:hidden">
                  Type
                </th>
                <th className="w-24 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/20">
              {displayed.map((file) => (
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
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="text-left text-[13px] text-zinc-400 transition-colors hover:text-emerald-400"
                        >
                          {file.name}
                        </button>
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
                      {!file.isDirectory && (
                        <a
                          href={`/api/download?path=${encodeURIComponent(file.path)}`}
                          download={file.name}
                          className="inline-flex rounded-md p-1.5 text-zinc-700 transition-colors hover:bg-zinc-800/50 hover:text-zinc-400"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}

                      {/* Actions menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu(
                              openMenu === file.path ? null : file.path,
                            );
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
                                openDialog({ type: "rename", target: file }, file.name)
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

      {/* ── File preview drawer ───────────────────────────────────────────── */}
      <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}

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
        {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={closeDialog}
            className="px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
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
            if (
              activeDialog?.type === "rename" &&
              !activeDialog.target.isDirectory
            ) {
              const ext = activeDialog.target.extension;
              const end = ext
                ? e.target.value.length - ext.length - 1
                : e.target.value.length;
              e.target.setSelectionRange(0, Math.max(0, end));
            } else {
              e.target.select();
            }
          }}
          className="w-full rounded-md border border-zinc-800/60 bg-zinc-800/30 px-3 py-2 font-mono text-[13px] text-zinc-200 outline-none transition-colors focus:border-zinc-600"
        />
        {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={closeDialog}
            className="px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
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
        {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={closeDialog}
            className="px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
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
        {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={closeDialog}
            className="px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
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
