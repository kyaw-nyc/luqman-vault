"use client";

import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
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
  X,
  LayoutList,
  LayoutGrid,
  Upload,
  CheckCircle,
  AlertCircle,
  Check,
  Bookmark,
  CheckSquare,
} from "lucide-react";
import type { FileItem, SearchResult } from "@/types/files";
import { FileIcon } from "./file-icon";
import { FilePreview } from "./file-preview";
import { BulkActionBar } from "./bulk-action-bar";
import { formatBytes, formatDateCompact } from "@/lib/formatters";
import {
  createFolder,
  renameItem,
  deleteItem,
  moveItem,
  searchFiles,
  getFolderSize,
  uploadFile,
  bulkDelete,
  bulkMove,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { usePins } from "@/hooks/use-pins";

// ── Search grouping helpers ────────────────────────────────────────────────────

type GroupBy = "flat" | "folder" | "type" | "recent";

function getTypeLabel(file: SearchResult): string {
  if (file.isDirectory) return "Folders";
  const ext = file.extension?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","webp","svg","bmp","tiff","heic"].includes(ext)) return "Images";
  if (["mp4","mov","avi","mkv","webm","m4v"].includes(ext)) return "Videos";
  if (["mp3","wav","flac","aac","ogg","m4a"].includes(ext)) return "Audio";
  if (["pdf","doc","docx","txt","md","pages","odt","rtf"].includes(ext)) return "Documents";
  if (["zip","tar","gz","bz2","rar","7z","xz"].includes(ext)) return "Archives";
  if (["js","ts","py","rb","go","rs","jsx","tsx","html","css","json","sh","yaml","yml"].includes(ext)) return "Code";
  return "Other";
}

function getRecencyLabel(file: SearchResult): string {
  const diff = Date.now() - new Date(file.modifiedAt).getTime();
  const day = 86_400_000;
  if (diff < day) return "Today";
  if (diff < 7 * day) return "This week";
  if (diff < 30 * day) return "This month";
  return "Older";
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ActiveDialog =
  | { type: "mkdir" }
  | { type: "rename"; target: FileItem }
  | { type: "delete"; target: FileItem }
  | { type: "move"; target: FileItem }
  | { type: "bulk-delete" }
  | { type: "bulk-move" }
  | null;

type SortKey = "name" | "size" | "modified";
type SortDir = "asc" | "desc";
type ViewMode = "list" | "grid";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FolderSizeCell({ sz }: { sz: number | null | undefined }) {
  if (sz === null || sz === undefined)
    return <span className="animate-pulse text-zinc-800">—</span>;
  if (sz < 0) return <>—</>;
  return <>{formatBytes(sz)}</>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FileBrowser({
  files,
  currentPath,
}: {
  files: FileItem[];
  currentPath: string;
}) {
  const router = useRouter();

  // File list
  const [localFiles, setLocalFiles] = useState<FileItem[]>(files);

  // Preview
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // View mode (grid / list) — persisted in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Lazy folder sizes (null = loading, -1 = error, ≥0 = bytes)
  const [folderSizes, setFolderSizes] = useState<Record<string, number | null>>({});

  // Sort / filter (normal mode only)
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [extFilter, setExtFilter] = useState("all");

  // Dialogs
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [inputValue, setInputValue] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline upload
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Multi-select
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  // Explicit select mode so mobile "Select" button works without pre-selecting
  const [selectMode, setSelectMode] = useState(false);
  const isSelecting = selectMode || selectedPaths.size > 0;

  // Pins
  const { pins, addPin, removePin, isPinned } = usePins();

  // Mobile action sheet
  const [mobileMenuFile, setMobileMenuFile] = useState<FileItem | null>(null);

  // Search input ref for keyboard shortcut focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Long-press timer for mobile multi-select
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search result grouping
  const [groupBy, setGroupBy] = useState<GroupBy>("folder");

  const isSearchMode = query.trim().length > 0;

  // Restore view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("lv-view-mode");
    if (saved === "grid" || saved === "list") setViewMode(saved);
  }, []);

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem("lv-view-mode", mode);
  }

  // Sync local file list on server re-render after mutations
  useEffect(() => {
    setLocalFiles(files);
  }, [files]);

  // Reset everything when navigating to a different folder
  useEffect(() => {
    setQuery("");
    setSearchResults(null);
    setExtFilter("all");
    setSortKey("name");
    setSortDir("asc");
    setFolderSizes({});
    setUploadQueue([]);
    setSelectedPaths(new Set());
    setSelectMode(false);
    setMobileMenuFile(null);
  }, [currentPath]);

  // Debounced recursive search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const results = await searchFiles(q, currentPath);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, currentPath]);

  // Lazy-load folder sizes for all directories in the current listing
  useEffect(() => {
    const dirs = localFiles.filter((f) => f.isDirectory);
    if (dirs.length === 0) {
      setFolderSizes({});
      return;
    }
    const initial: Record<string, null> = {};
    dirs.forEach((d) => { initial[d.path] = null; });
    setFolderSizes(initial);

    dirs.forEach((dir) => {
      getFolderSize(dir.path)
        .then((size) =>
          setFolderSizes((prev) => ({ ...prev, [dir.path]: size })),
        )
        .catch(() =>
          setFolderSizes((prev) => ({ ...prev, [dir.path]: -1 })),
        );
    });
  }, [localFiles]);

  // Close action menu on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handler = () => setOpenMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenu]);

  // ── Inline upload ─────────────────────────────────────────────────────────

  const enqueueFiles = useCallback(
    async (fileList: FileList) => {
      const newItems: UploadItem[] = Array.from(fileList).map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: f,
        progress: 0,
        status: "pending" as const,
      }));
      setUploadQueue((prev) => [...prev, ...newItems]);

      for (const item of newItems) {
        setUploadQueue((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, status: "uploading" } : u)),
        );
        try {
          await uploadFile(item.file, currentPath, (pct) => {
            setUploadQueue((prev) =>
              prev.map((u) => (u.id === item.id ? { ...u, progress: pct } : u)),
            );
          });
          setUploadQueue((prev) =>
            prev.map((u) =>
              u.id === item.id ? { ...u, status: "complete", progress: 100 } : u,
            ),
          );
        } catch {
          setUploadQueue((prev) =>
            prev.map((u) => (u.id === item.id ? { ...u, status: "error" } : u)),
          );
        }
      }
      router.refresh();
    },
    [currentPath, router],
  );

  // ── Derived data (normal mode) ────────────────────────────────────────────

  const extensions = useMemo(() => {
    const exts = localFiles
      .filter((f) => !f.isDirectory && f.extension)
      .map((f) => f.extension!.toLowerCase());
    return [...new Set(exts)].sort();
  }, [localFiles]);

  const displayed = useMemo(() => {
    const filtered = localFiles.filter((f) => {
      return (
        extFilter === "all" ||
        (!f.isDirectory && f.extension?.toLowerCase() === extFilter)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === "name") {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        const cmp = a.name.localeCompare(b.name);
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortKey === "size") {
        const aSize = a.isDirectory ? (folderSizes[a.path] ?? 0) : a.size;
        const bSize = b.isDirectory ? (folderSizes[b.path] ?? 0) : b.size;
        const cmp = aSize - bSize;
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortKey === "modified") {
        const cmp =
          new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
        return sortDir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }, [localFiles, extFilter, sortKey, sortDir, folderSizes]);

  const dirCount = localFiles.filter((f) => f.isDirectory).length;
  const fileCount = localFiles.length - dirCount;

  // Grouped search results
  const groupedResults = useMemo(() => {
    if (!searchResults || groupBy === "flat") return null;
    const map = new Map<string, SearchResult[]>();
    for (const file of searchResults) {
      const key =
        groupBy === "folder" ? (file.parentPath || "/") :
        groupBy === "type"   ? getTypeLabel(file) :
                               getRecencyLabel(file);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(file);
    }
    const entries = [...map.entries()];
    if (groupBy === "recent") {
      const order = ["Today", "This week", "This month", "Older"];
      entries.sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
    } else {
      entries.sort(([a], [b]) => a.localeCompare(b));
    }
    return entries.map(([key, items]) => ({ key, items }));
  }, [searchResults, groupBy]);

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

  // ── Selection helpers ─────────────────────────────────────────────────────

  function toggleSelect(path: string) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function clearSelection() {
    setSelectedPaths(new Set());
    setSelectMode(false);
  }

  function selectAll() {
    setSelectedPaths(new Set(displayed.map((f) => f.path)));
  }

  // ── Long-press for mobile multi-select ───────────────────────────────────

  function handleTouchStart(path: string) {
    longPressRef.current = setTimeout(() => {
      longPressRef.current = null;
      setSelectMode(true);
      setSelectedPaths((prev) => { const n = new Set(prev); n.add(path); return n; });
      navigator.vibrate?.(40);
    }, 500);
  }

  function handleTouchEnd() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  // ── Keyboard shortcuts (desktop, guards against inputs/dialogs) ──────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) return;
      if (activeDialog !== null) return;

      switch (e.key) {
        case "/":
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case "u":
          if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !isSearchMode) {
            e.preventDefault();
            uploadInputRef.current?.click();
          }
          break;
        case "n":
          if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !isSearchMode) {
            e.preventDefault();
            openDialog({ type: "mkdir" });
          }
          break;
        case "Delete":
        case "Backspace":
          if (isSelecting) {
            e.preventDefault();
            openDialog({ type: "bulk-delete" });
          }
          break;
        case "Escape":
          if (isSelecting) clearSelection();
          else if (isSearchMode) setQuery("");
          break;
        case "a":
          if ((e.metaKey || e.ctrlKey) && !isSearchMode && displayed.length > 0) {
            e.preventDefault();
            selectAll();
          }
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDialog, isSelecting, isSearchMode, displayed.length]);

  // ── Bulk handlers ─────────────────────────────────────────────────────────

  async function handleBulkDelete() {
    const paths = Array.from(selectedPaths);
    setLocalFiles((prev) => prev.filter((f) => !selectedPaths.has(f.path)));
    clearSelection();
    closeDialog();
    try {
      await bulkDelete(paths);
      router.refresh();
    } catch (e) {
      setLocalFiles(files);
      setError(e instanceof Error ? e.message : "Bulk delete failed");
    }
  }

  async function handleBulkMove() {
    if (!inputValue.trim()) return;
    const paths = Array.from(selectedPaths);
    const dest = inputValue.trim();
    setLocalFiles((prev) => prev.filter((f) => !selectedPaths.has(f.path)));
    clearSelection();
    closeDialog();
    try {
      await bulkMove(paths, dest);
      router.refresh();
    } catch (e) {
      setLocalFiles(files);
      setError(e instanceof Error ? e.message : "Bulk move failed");
    }
  }

  // ── Shared row actions renderer ────────────────────────────────────────────

  function RowActions({ file }: { file: FileItem }) {
    return (
      <div className="flex items-center justify-end gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        {!file.isDirectory && (
          <a
            href={`/api/download?path=${encodeURIComponent(file.path)}`}
            download={file.name}
            className="inline-flex rounded-md p-2 text-zinc-700 transition-colors hover:bg-zinc-800/50 hover:text-zinc-400"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </a>
        )}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.innerWidth < 640) {
                setMobileMenuFile(file);
              } else {
                setOpenMenu(openMenu === file.path ? null : file.path);
              }
            }}
            className="inline-flex rounded-md p-2 text-zinc-700 transition-colors hover:bg-zinc-800/50 hover:text-zinc-400"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {openMenu === file.path && (
            <div
              className="absolute right-0 bottom-full z-20 mb-1 w-40 overflow-hidden rounded-lg border border-zinc-800/60 bg-[#0d0e13] py-1 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() =>
                  openDialog({ type: "rename", target: file }, file.name)
                }
                className="flex w-full items-center gap-2.5 px-3 py-3 text-[13px] text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
              <button
                onClick={() => openDialog({ type: "move", target: file })}
                className="flex w-full items-center gap-2.5 px-3 py-3 text-[13px] text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
              >
                <FolderInput className="h-3.5 w-3.5" />
                Move to
              </button>
              <div className="my-1 border-t border-zinc-800/40" />
              <button
                onClick={() => openDialog({ type: "delete", target: file })}
                className="flex w-full items-center gap-2.5 px-3 py-3 text-[13px] text-red-400/80 transition-colors hover:bg-red-500/5 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Move to Trash
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const allDone = uploadQueue.length > 0 && uploadQueue.every((u) => u.status === "complete" || u.status === "error");

  return (
    <>
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="mb-3 space-y-2">
        {/* Search row */}
        <div className="relative">
          {searchLoading ? (
            <Loader2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-zinc-600" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-700" />
          )}
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (e.target as HTMLInputElement).blur()}
            placeholder="Search files and folders…"
            className="w-full rounded-lg border border-zinc-800/50 bg-zinc-900/40 py-2 pl-9 pr-9 text-[13px] text-zinc-300 outline-none placeholder:text-zinc-700 transition-colors focus:border-zinc-700/60"
          />
          {isSearchMode && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors hover:text-zinc-400"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Controls row — normal mode */}
        {!isSearchMode && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Left: sort/filter (desktop only) + count */}
            <div className="flex items-center gap-2">
              {/* Sort + filter — hidden on mobile */}
              <div className="hidden items-center gap-2 sm:flex">
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
              </div>

              {/* Count hint — always visible */}
              <span className="font-mono text-[11px] text-zinc-700">
                {extFilter !== "all"
                  ? `${displayed.length} result${displayed.length !== 1 ? "s" : ""}`
                  : `${dirCount > 0 ? `${dirCount} folder${dirCount !== 1 ? "s" : ""}` : ""}${dirCount > 0 && fileCount > 0 ? "  ·  " : ""}${fileCount > 0 ? `${fileCount} file${fileCount !== 1 ? "s" : ""}` : ""}`}
              </span>
            </div>

            {/* Right: view toggle + upload + new folder */}
            <div className="flex items-center gap-2">
              {/* Mobile: enter / exit selection mode */}
              {displayed.length > 0 && (
                <button
                  onClick={() => isSelecting ? clearSelection() : setSelectMode(true)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-3 py-2 text-[12px] transition-all sm:hidden",
                    isSelecting
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-800/50 bg-zinc-900/40 text-zinc-500",
                  )}
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>{isSelecting ? "Done" : "Select"}</span>
                </button>
              )}

              {/* View toggle */}
              <div className="flex rounded-md border border-zinc-800/50 bg-zinc-900/40 p-0.5">
                <button
                  onClick={() => changeViewMode("list")}
                  className={cn(
                    "rounded p-2 transition-colors",
                    viewMode === "list"
                      ? "bg-zinc-700/60 text-zinc-200"
                      : "text-zinc-600 hover:text-zinc-400",
                  )}
                  title="List view"
                >
                  <LayoutList className="h-4 w-4" />
                </button>
                <button
                  onClick={() => changeViewMode("grid")}
                  className={cn(
                    "rounded p-2 transition-colors",
                    viewMode === "grid"
                      ? "bg-zinc-700/60 text-zinc-200"
                      : "text-zinc-600 hover:text-zinc-400",
                  )}
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              {/* Upload button */}
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="flex items-center gap-2 rounded-md border border-zinc-800/50 bg-zinc-900/40 px-3 py-2 text-[12px] text-zinc-500 transition-all hover:border-zinc-700/60 hover:text-zinc-300"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </button>

              {/* New folder */}
              <button
                onClick={() => openDialog({ type: "mkdir" })}
                className="flex items-center gap-2 rounded-md border border-zinc-800/50 bg-zinc-900/40 px-3 py-2 text-[12px] text-zinc-500 transition-all hover:border-zinc-700/60 hover:text-zinc-300"
              >
                <FolderPlus className="h-4 w-4" />
                <span className="hidden sm:inline">New folder</span>
              </button>

              {/* Pin button — only when not at root */}
              {currentPath !== "/" && (
                <button
                  onClick={() =>
                    isPinned(currentPath)
                      ? removePin(currentPath)
                      : addPin(currentPath)
                  }
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-[12px] transition-all",
                    isPinned(currentPath)
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/50"
                      : "border-zinc-800/50 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700/60 hover:text-zinc-300",
                  )}
                  title={isPinned(currentPath) ? "Remove pin" : "Pin this folder"}
                >
                  <Bookmark className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Controls row — search mode */}
        {isSearchMode && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-zinc-700">
              {searchLoading
                ? "Searching…"
                : searchResults === null
                  ? ""
                  : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} in ${currentPath === "/" ? "all folders" : currentPath}`}
            </span>
            <div className="flex items-center gap-2">
              {/* Grouping toggle — only when there are results */}
              {!searchLoading && searchResults !== null && searchResults.length > 0 && (
                <div className="flex items-center rounded-md border border-zinc-800/50 bg-zinc-900/40 p-0.5">
                  {(["flat", "folder", "type", "recent"] as GroupBy[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGroupBy(g)}
                      className={cn(
                        "rounded px-2.5 py-1 text-[11px] transition-colors",
                        groupBy === g
                          ? "bg-zinc-700/60 text-zinc-200"
                          : "text-zinc-600 hover:text-zinc-400",
                      )}
                    >
                      {g === "flat" ? "Flat" : g === "folder" ? "Folder" : g === "type" ? "Type" : "Date"}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => openDialog({ type: "mkdir" })}
                className="flex items-center gap-2 rounded-md border border-zinc-800/50 bg-zinc-900/40 px-3 py-1.5 text-[12px] text-zinc-500 transition-all hover:border-zinc-700/60 hover:text-zinc-300"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New folder</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bulk action bar ───────────────────────────────────────────────── */}
      {isSelecting && (
        <BulkActionBar
          count={selectedPaths.size}
          total={displayed.length}
          onDelete={() => openDialog({ type: "bulk-delete" })}
          onMove={() => openDialog({ type: "bulk-move" })}
          onSelectAll={selectAll}
          onClear={clearSelection}
        />
      )}

      {/* ── Mobile pins strip (hidden on md+, where sidebar shows them) ──── */}
      {pins.length > 0 && !isSearchMode && (
        <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 md:hidden">
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-zinc-700">
            Pinned
          </span>
          {pins.map((pin) => (
            <Link
              key={pin.path}
              href={`/files?path=${encodeURIComponent(pin.path)}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-800/50 bg-zinc-900/40 px-3 py-1.5 text-[11px] text-zinc-400 transition-colors hover:border-zinc-700/60 hover:text-zinc-200"
            >
              <Bookmark className="h-3 w-3 shrink-0" />
              {pin.label}
            </Link>
          ))}
        </div>
      )}

      {/* ── Upload queue ──────────────────────────────────────────────────── */}
      {uploadQueue.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-lg border border-zinc-800/40 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800/30 px-4 py-2">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
              Uploading to {currentPath}
            </p>
            {allDone && (
              <button
                onClick={() => setUploadQueue([])}
                className="text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
              >
                Clear
              </button>
            )}
          </div>
          {uploadQueue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 border-b border-zinc-800/20 px-4 py-2.5 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-[12px] text-zinc-400">{item.file.name}</p>
                {item.status === "uploading" && (
                  <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-150"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {item.status === "complete" ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500/70" />
                ) : item.status === "error" ? (
                  <AlertCircle className="h-3.5 w-3.5 text-red-400/70" />
                ) : item.status === "uploading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                ) : (
                  <span className="font-mono text-[10px] text-zinc-700">queued</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Content (with drag-to-upload) ─────────────────────────────────── */}
      <div
        className="relative"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setIsDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            enqueueFiles(e.dataTransfer.files);
          }
        }}
      >
        {/* Drop overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/[0.04]">
            <Upload className="mb-3 h-8 w-8 text-emerald-400/60" />
            <p className="text-[14px] font-medium text-emerald-400/80">
              Drop to upload to {currentPath}
            </p>
          </div>
        )}

        {isSearchMode ? (
          /* ── Search results ──────────────────────────────────────────── */
          searchLoading || searchResults === null ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/50 py-24">
              <Search className="mb-4 h-10 w-10 text-zinc-800" />
              <p className="text-[13px] text-zinc-600">
                No files match &ldquo;{query}&rdquo;
              </p>
              <button
                onClick={() => setQuery("")}
                className="mt-3 text-[13px] text-emerald-500/70 transition-colors hover:text-emerald-400"
              >
                Clear search
              </button>
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
                  {/* Shared row renderer */}
                  {(() => {
                    const renderRow = (file: SearchResult) => (
                      <tr
                        key={file.path}
                        className="group relative transition-colors hover:bg-zinc-800/20"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <FileIcon name={file.name} isDirectory={file.isDirectory} />
                            <div className="min-w-0">
                              {file.isDirectory ? (
                                <Link
                                  href={`/files?path=${encodeURIComponent(file.path)}`}
                                  className="block text-[13px] font-medium text-zinc-200 transition-colors hover:text-emerald-400"
                                >
                                  {file.name}
                                </Link>
                              ) : (
                                <button
                                  onClick={() => setPreviewFile(file)}
                                  className="block text-left text-[13px] text-zinc-400 transition-colors hover:text-emerald-400"
                                >
                                  {file.name}
                                </button>
                              )}
                              {groupBy === "flat" && (
                                <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-700">
                                  {file.parentPath}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-[12px] text-zinc-600 max-sm:hidden">
                          {file.isDirectory ? "—" : formatBytes(file.size)}
                        </td>
                        <td className="px-5 py-4 text-[12px] text-zinc-600 max-sm:hidden">
                          {formatDateCompact(file.modifiedAt)}
                        </td>
                        <td className="px-5 py-4 font-mono text-[12px] text-zinc-600 max-sm:hidden">
                          {file.isDirectory ? "dir" : file.extension?.toLowerCase() || "—"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <RowActions file={file} />
                        </td>
                      </tr>
                    );

                    if (groupedResults) {
                      return groupedResults.map(({ key, items }) => (
                        <Fragment key={key}>
                          <tr className="bg-zinc-900/20">
                            <td colSpan={5} className="px-5 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                                  {key}
                                </span>
                                <span className="font-mono text-[10px] text-zinc-700">
                                  {items.length}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {items.map(renderRow)}
                        </Fragment>
                      ));
                    }
                    return searchResults!.map(renderRow);
                  })()}
                </tbody>
              </table>
            </div>
          )
        ) : displayed.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/50 py-24">
            <FolderOpen className="mb-4 h-10 w-10 text-zinc-800" />
            <p className="text-[13px] text-zinc-600">
              {extFilter !== "all" ? "No matching files" : "This folder is empty"}
            </p>
            {currentPath !== "/" && extFilter === "all" && (
              <Link
                href="/files"
                className="mt-3 text-[13px] text-emerald-500/70 transition-colors hover:text-emerald-400"
              >
                Back to root
              </Link>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* ── Grid view ───────────────────────────────────────────────── */
          <div className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-2">
            {displayed.map((file) => (
              <div
                key={file.path}
                onTouchStart={() => handleTouchStart(file.path)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-xl border bg-zinc-900/30 p-4 transition-all hover:bg-zinc-800/20",
                  selectedPaths.has(file.path)
                    ? "border-emerald-500/60 bg-emerald-500/[0.08] ring-1 ring-emerald-500/20"
                    : "border-zinc-800/40 hover:border-zinc-700/60",
                )}
              >
                {/* Selection capture overlay — sits between content and the checkbox */}
                {isSelecting && (
                  <button
                    onClick={() => toggleSelect(file.path)}
                    className="absolute inset-0 z-[5] rounded-xl"
                    aria-label={`Select ${file.name}`}
                  />
                )}

                {/* Checkbox (top-left) */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(file.path); }}
                  className={cn(
                    "absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-md border transition-all",
                    selectedPaths.has(file.path)
                      ? "border-emerald-500 bg-emerald-500 shadow-sm shadow-emerald-500/30"
                      : "border-zinc-700 bg-zinc-900/80 hover:border-zinc-500",
                    isSelecting ? "opacity-100" : "opacity-0 group-hover:opacity-70",
                  )}
                >
                  {selectedPaths.has(file.path) && (
                    <Check className="h-3 w-3 text-zinc-950" />
                  )}
                </button>

                {/* Tile actions — hidden while in selection mode */}
                <div className={cn(
                  "absolute right-1 top-1 z-10 flex items-center gap-0",
                  isSelecting ? "hidden" : "sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100",
                )}>
                  {!file.isDirectory && (
                    <a
                      href={`/api/download?path=${encodeURIComponent(file.path)}`}
                      download={file.name}
                      className="inline-flex rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-700/50 hover:text-zinc-300"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.innerWidth < 640) {
                          setMobileMenuFile(file);
                        } else {
                          setOpenMenu(openMenu === file.path ? null : file.path);
                        }
                      }}
                      className="inline-flex rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-700/50 hover:text-zinc-300"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {openMenu === file.path && (
                      <div
                        className="absolute right-0 bottom-full z-20 mb-1 w-36 overflow-hidden rounded-lg border border-zinc-800/60 bg-[#0d0e13] py-1 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openDialog({ type: "rename", target: file }, file.name)}
                          className="flex w-full items-center gap-2.5 px-3 py-3 text-[13px] text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Rename
                        </button>
                        <button
                          onClick={() => openDialog({ type: "move", target: file })}
                          className="flex w-full items-center gap-2.5 px-3 py-3 text-[13px] text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-200"
                        >
                          <FolderInput className="h-3.5 w-3.5" />
                          Move to
                        </button>
                        <div className="my-1 border-t border-zinc-800/40" />
                        <button
                          onClick={() => openDialog({ type: "delete", target: file })}
                          className="flex w-full items-center gap-2.5 px-3 py-3 text-[13px] text-red-400/80 transition-colors hover:bg-red-500/5 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Icon */}
                <div className="mt-2">
                  <FileIcon name={file.name} isDirectory={file.isDirectory} size="lg" />
                </div>

                {/* Name */}
                {file.isDirectory ? (
                  <Link
                    href={`/files?path=${encodeURIComponent(file.path)}`}
                    className="line-clamp-2 w-full text-center text-[12px] font-medium leading-tight text-zinc-300 transition-colors hover:text-emerald-400"
                  >
                    {file.name}
                  </Link>
                ) : (
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="line-clamp-2 w-full text-center text-[12px] leading-tight text-zinc-400 transition-colors hover:text-emerald-400"
                  >
                    {file.name}
                  </button>
                )}

                {/* Size */}
                <p className="font-mono text-[10px] text-zinc-700">
                  {file.isDirectory ? (
                    <FolderSizeCell sz={folderSizes[file.path]} />
                  ) : (
                    formatBytes(file.size)
                  )}
                </p>
              </div>
            ))}
          </div>
        ) : (
          /* ── List view ───────────────────────────────────────────────── */
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
                    onTouchStart={() => handleTouchStart(file.path)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    className={cn(
                      "group relative transition-colors hover:bg-zinc-800/20",
                      selectedPaths.has(file.path) && "bg-emerald-500/[0.08] ring-1 ring-inset ring-emerald-500/10",
                    )}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelect(file.path); }}
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                            selectedPaths.has(file.path)
                              ? "border-emerald-500 bg-emerald-500 shadow-sm shadow-emerald-500/30"
                              : "border-zinc-700 hover:border-zinc-500",
                            isSelecting ? "opacity-100" : "opacity-0 group-hover:opacity-70",
                          )}
                        >
                          {selectedPaths.has(file.path) && (
                            <Check className="h-3 w-3 text-zinc-950" />
                          )}
                        </button>
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
                    <td className="px-5 py-4 font-mono text-[12px] text-zinc-600 max-sm:hidden">
                      {file.isDirectory ? (
                        <FolderSizeCell sz={folderSizes[file.path]} />
                      ) : (
                        formatBytes(file.size)
                      )}
                    </td>
                    <td className="px-5 py-4 text-[12px] text-zinc-600 max-sm:hidden">
                      {formatDateCompact(file.modifiedAt)}
                    </td>
                    <td className="px-5 py-4 font-mono text-[12px] text-zinc-600 max-sm:hidden">
                      {file.isDirectory ? "dir" : file.extension?.toLowerCase() || "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <RowActions file={file} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Mobile action sheet ───────────────────────────────────────────── */}
      {mobileMenuFile && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuFile(null)}
          />
          {/* Sheet */}
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-zinc-800/40 bg-[#0d0e13] pt-2"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Handle bar */}
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700" />

            {/* File info header */}
            <div className="flex items-center gap-3 border-b border-zinc-800/30 px-5 pb-4">
              <FileIcon name={mobileMenuFile.name} isDirectory={mobileMenuFile.isDirectory} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-zinc-200">
                  {mobileMenuFile.name}
                </p>
                <p className="font-mono text-[11px] text-zinc-600">
                  {mobileMenuFile.isDirectory ? "Folder" : formatBytes(mobileMenuFile.size)}
                </p>
              </div>
              <button
                onClick={() => setMobileMenuFile(null)}
                className="rounded-full p-1.5 text-zinc-600 transition-colors hover:text-zinc-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="py-2">
              {!mobileMenuFile.isDirectory && (
                <a
                  href={`/api/download?path=${encodeURIComponent(mobileMenuFile.path)}`}
                  download={mobileMenuFile.name}
                  onClick={() => setMobileMenuFile(null)}
                  className="flex items-center gap-4 px-5 py-4 text-[15px] text-zinc-300 transition-colors active:bg-zinc-800/50"
                >
                  <Download className="h-5 w-5 text-zinc-500" />
                  Download
                </a>
              )}
              <button
                onClick={() => {
                  openDialog({ type: "rename", target: mobileMenuFile }, mobileMenuFile.name);
                  setMobileMenuFile(null);
                }}
                className="flex w-full items-center gap-4 px-5 py-4 text-[15px] text-zinc-300 transition-colors active:bg-zinc-800/50"
              >
                <Pencil className="h-5 w-5 text-zinc-500" />
                Rename
              </button>
              <button
                onClick={() => {
                  openDialog({ type: "move", target: mobileMenuFile });
                  setMobileMenuFile(null);
                }}
                className="flex w-full items-center gap-4 px-5 py-4 text-[15px] text-zinc-300 transition-colors active:bg-zinc-800/50"
              >
                <FolderInput className="h-5 w-5 text-zinc-500" />
                Move to
              </button>
              <button
                onClick={() => {
                  toggleSelect(mobileMenuFile.path);
                  setSelectMode(true);
                  setMobileMenuFile(null);
                }}
                className="flex w-full items-center gap-4 px-5 py-4 text-[15px] text-zinc-300 transition-colors active:bg-zinc-800/50"
              >
                <CheckSquare className="h-5 w-5 text-zinc-500" />
                Select
              </button>
              <div className="mx-5 my-1 border-t border-zinc-800/30" />
              <button
                onClick={() => {
                  openDialog({ type: "delete", target: mobileMenuFile });
                  setMobileMenuFile(null);
                }}
                className="flex w-full items-center gap-4 px-5 py-4 text-[15px] text-red-400/80 transition-colors active:bg-red-500/5"
              >
                <Trash2 className="h-5 w-5" />
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden file input for upload ──────────────────────────────────── */}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            enqueueFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* ── File preview drawer ───────────────────────────────────────────── */}
      <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}

      {/* New folder */}
      <Dialog open={activeDialog?.type === "mkdir"} onClose={closeDialog} title="New folder">
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
      <Dialog open={activeDialog?.type === "rename"} onClose={closeDialog} title="Rename">
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

      {/* Delete (→ Trash) */}
      <Dialog open={activeDialog?.type === "delete"} onClose={closeDialog} title="Move to Trash">
        <p className="text-[13px] text-zinc-400">
          Move{" "}
          <span className="font-mono text-zinc-300">
            {activeDialog?.type === "delete" && activeDialog.target.name}
          </span>
          {activeDialog?.type === "delete" && activeDialog.target.isDirectory
            ? " and all its contents"
            : ""}
          {" "}to Trash? You can restore it from the Trash page.
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
            className="flex items-center gap-2 rounded-md bg-zinc-700 px-4 py-1.5 text-[13px] font-medium text-zinc-100 transition-all hover:bg-zinc-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Move to Trash
          </button>
        </div>
      </Dialog>

      {/* Move */}
      <Dialog open={activeDialog?.type === "move"} onClose={closeDialog} title="Move to">
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

      {/* Bulk delete confirmation */}
      <Dialog
        open={activeDialog?.type === "bulk-delete"}
        onClose={closeDialog}
        title="Move to Trash"
      >
        <p className="text-[13px] text-zinc-400">
          Move{" "}
          <span className="font-semibold text-zinc-200">{selectedPaths.size}</span>{" "}
          item{selectedPaths.size !== 1 ? "s" : ""} to Trash?
          You can restore them later from the Trash page.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={closeDialog}
            className="px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 rounded-md bg-red-500/80 px-4 py-1.5 text-[13px] font-medium text-white transition-all hover:bg-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Move to Trash
          </button>
        </div>
      </Dialog>

      {/* Bulk move */}
      <Dialog
        open={activeDialog?.type === "bulk-move"}
        onClose={closeDialog}
        title="Move items"
      >
        <p className="mb-3 text-[13px] text-zinc-500">
          Moving{" "}
          <span className="font-semibold text-zinc-300">{selectedPaths.size}</span>{" "}
          item{selectedPaths.size !== 1 ? "s" : ""}
        </p>
        <label className="mb-1.5 block text-[11px] uppercase tracking-widest text-zinc-600">
          Destination folder
        </label>
        <input
          autoFocus
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleBulkMove()}
          placeholder="/School"
          className="w-full rounded-md border border-zinc-800/60 bg-zinc-800/30 px-3 py-2 font-mono text-[13px] text-zinc-200 outline-none placeholder:text-zinc-700 transition-colors focus:border-zinc-600"
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={closeDialog}
            className="px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkMove}
            disabled={!inputValue.trim()}
            className="flex items-center gap-2 rounded-md bg-emerald-500/90 px-4 py-1.5 text-[13px] font-medium text-zinc-950 transition-all hover:bg-emerald-400 disabled:opacity-40"
          >
            Move
          </button>
        </div>
      </Dialog>
    </>
  );
}
