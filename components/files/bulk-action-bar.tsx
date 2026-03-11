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
    <div className="sticky top-0 z-20 mb-3 flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-950/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:gap-2 sm:px-4 sm:py-2.5">
      <span className="shrink-0 font-mono text-[11px] text-zinc-400 sm:text-[12px]">
        <span className="font-semibold text-zinc-100">{count}</span> selected
      </span>

      {count < total && (
        <button
          onClick={onSelectAll}
          className="shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300 sm:px-2.5"
          title={`Select all ${total}`}
        >
          <CheckSquare className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="flex-1" />

      <button
        onClick={onMove}
        className="flex shrink-0 items-center gap-1.5 rounded-md p-2 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200 sm:px-3 sm:py-1.5"
        title="Move"
      >
        <FolderInput className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Move</span>
      </button>

      <button
        onClick={onDelete}
        className="flex shrink-0 items-center gap-1.5 rounded-md p-2 text-[12px] text-red-400/80 transition-colors hover:bg-red-500/5 hover:text-red-400 sm:px-3 sm:py-1.5"
        title="Move to Trash"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Move to Trash</span>
      </button>

      <div className="h-4 w-px shrink-0 bg-zinc-800" />
      <button
        onClick={onClear}
        className="shrink-0 rounded-md p-1.5 text-zinc-700 transition-colors hover:text-zinc-400"
        title="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
