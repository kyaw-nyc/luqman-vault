"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RotateCcw, X, AlertTriangle } from "lucide-react";
import type { TrashItem } from "@/types/files";
import { FileIcon } from "./file-icon";
import { formatBytes, formatDateCompact } from "@/lib/formatters";
import { restoreTrashItem, permanentDeleteTrashItem, emptyTrash } from "@/lib/api";
import { Dialog } from "@/components/ui/dialog";

function isValidTrashItem(i: unknown): i is TrashItem {
  return (
    i != null &&
    typeof (i as TrashItem).id === "string" &&
    typeof (i as TrashItem).name === "string" &&
    typeof (i as TrashItem).originalPath === "string" &&
    typeof (i as TrashItem).trashedAt === "string" &&
    typeof (i as TrashItem).isDirectory === "boolean" &&
    typeof (i as TrashItem).size === "number"
  );
}

export function TrashBrowser({ items: initial }: { items: TrashItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<TrashItem[]>(() =>
    Array.isArray(initial) ? initial.filter(isValidTrashItem) : [],
  );
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // id of item being acted on

  async function handleRestore(item: TrashItem) {
    setBusy(item.id);
    try {
      await restoreTrashItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(null);
    }
  }

  async function handlePermanentDelete(id: string) {
    setConfirmDeleteId(null);
    setBusy(id);
    try {
      await permanentDeleteTrashItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleEmptyTrash() {
    try {
      await emptyTrash();
      setItems([]);
      setConfirmEmpty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to empty trash");
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/50 py-24">
        <Trash2 className="mb-4 h-10 w-10 text-zinc-800" />
        <p className="text-[13px] text-zinc-600">Trash is empty</p>
        <p className="mt-1 text-[11px] text-zinc-700">Deleted files will appear here</p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-[12px] text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-400/60 hover:text-red-400">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Safety note */}
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500/60" />
        <p className="text-[12px] text-zinc-500">
          Items permanently deleted from Trash <span className="text-zinc-400">cannot be recovered</span>. Use Restore to return items to their original location.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[11px] text-zinc-600">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setConfirmEmpty(true)}
          className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-[12px] text-red-400/80 transition-all hover:border-red-500/40 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Empty Trash
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800/40">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800/40 bg-zinc-900/30">
              <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:px-5 sm:py-3 sm:text-[11px]">
                Name
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 max-sm:hidden">
                Original location
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 max-sm:hidden">
                Size
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 max-sm:hidden">
                Deleted
              </th>
              <th className="w-auto px-2 py-2.5 sm:w-24 sm:px-5 sm:py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/20">
            {items.map((item) => (
              <tr
                key={item.id}
                className="group transition-colors hover:bg-zinc-800/20"
              >
                <td className="px-3 py-3 sm:px-5 sm:py-4">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <FileIcon name={item.name} isDirectory={item.isDirectory} />
                    <div className="min-w-0">
                      <span className="block truncate text-[13px] text-zinc-300">{item.name}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-zinc-700 sm:hidden">
                        {item.isDirectory ? "Folder" : formatBytes(item.size)}
                        {" · "}
                        {formatDateCompact(item.trashedAt)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-[11px] text-zinc-700 max-sm:hidden">
                  {item.originalPath}
                </td>
                <td className="px-5 py-4 font-mono text-[12px] text-zinc-600 max-sm:hidden">
                  {item.isDirectory ? "—" : formatBytes(item.size)}
                </td>
                <td className="px-5 py-4 text-[12px] text-zinc-600 max-sm:hidden">
                  {formatDateCompact(item.trashedAt)}
                </td>
                <td className="px-2 py-3 sm:px-5 sm:py-4">
                  <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={busy === item.id}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-emerald-400 disabled:opacity-40 sm:gap-1.5 sm:px-2.5"
                      title="Restore to original location"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span className="text-[10px] sm:text-[11px]">Restore</span>
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(item.id)}
                      disabled={busy === item.id}
                      className="inline-flex items-center rounded-md p-2 text-zinc-700 transition-colors hover:bg-red-500/5 hover:text-red-400 disabled:opacity-40"
                      title="Delete permanently"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-item permanent delete confirmation */}
      <Dialog
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete permanently"
      >
        <p className="text-[13px] text-zinc-400">
          Permanently delete{" "}
          <span className="font-mono text-zinc-300">
            {items.find((i) => i.id === confirmDeleteId)?.name}
          </span>
          ? <span className="text-zinc-300">This cannot be undone.</span>
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={() => confirmDeleteId && handlePermanentDelete(confirmDeleteId)}
            className="rounded-md bg-red-500/80 px-4 py-1.5 text-[13px] font-medium text-white transition-all hover:bg-red-500"
          >
            Delete permanently
          </button>
        </div>
      </Dialog>

      {/* Empty trash confirmation */}
      <Dialog
        open={confirmEmpty}
        onClose={() => setConfirmEmpty(false)}
        title="Empty Trash"
      >
        <p className="text-[13px] text-zinc-400">
          Permanently delete all{" "}
          <span className="font-semibold text-zinc-200">{items.length}</span>{" "}
          item{items.length !== 1 ? "s" : ""} in Trash?{" "}
          <span className="text-zinc-300">This cannot be undone.</span>
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => setConfirmEmpty(false)}
            className="px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={handleEmptyTrash}
            className="rounded-md bg-red-500/80 px-4 py-1.5 text-[13px] font-medium text-white transition-all hover:bg-red-500"
          >
            Empty Trash
          </button>
        </div>
      </Dialog>
    </>
  );
}
