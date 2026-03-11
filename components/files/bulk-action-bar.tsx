"use client";

import { Trash2, FolderInput, X, CheckSquare } from "lucide-react";

interface BulkActionBarProps {
  count: number;
  total: number;
  onDelete: () => void;
  onMove: () => void;
  onSelectAll: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  count,
  total,
  onDelete,
  onMove,
  onSelectAll,
  onClear,
}: BulkActionBarProps) {
  return (
    <div className="sticky top-0 z-20 mb-3 flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-950/90 px-4 py-2.5 shadow-lg backdrop-blur-sm">
      {/* Count */}
      <span className="font-mono text-[12px] text-zinc-400">
        <span className="font-semibold text-zinc-100">{count}</span> selected
      </span>

      {/* Select all */}
      {count < total && (
        <button
          onClick={onSelectAll}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">All {total}</span>
        </button>
      )}

      <div className="flex-1" />

      {/* Move */}
      <button
        onClick={onMove}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
      >
        <FolderInput className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Move</span>
      </button>

      {/* Trash */}
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] text-red-400/80 transition-colors hover:bg-red-500/5 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Trash</span>
      </button>

      {/* Divider + clear */}
      <div className="h-4 w-px bg-zinc-800" />
      <button
        onClick={onClear}
        className="rounded-md p-1.5 text-zinc-700 transition-colors hover:text-zinc-400"
        title="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
