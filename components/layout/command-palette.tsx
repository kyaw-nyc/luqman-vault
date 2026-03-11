"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Activity,
  Search,
  Terminal,
  HardDrive,
  Trash2,
  Folder,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePins } from "@/hooks/use-pins";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: typeof LayoutDashboard;
  action: () => void;
  group?: string;
}

function useCommands(router: ReturnType<typeof useRouter>, close: () => void) {
  const { pins } = usePins();
  const go = (href: string) => {
    router.push(href);
    close();
  };

  const pinCommands: Command[] = pins.map((pin) => ({
    id: `pin-${pin.path}`,
    label: pin.label,
    description: pin.path,
    icon: Folder,
    action: () => go(`/files?path=${encodeURIComponent(pin.path)}`),
    group: "Favorites",
  }));

  const navCommands: Command[] = [
    {
      id: "dashboard",
      label: "Go to Dashboard",
      description: "Overview and stats",
      icon: LayoutDashboard,
      action: () => go("/dashboard"),
    },
    {
      id: "files",
      label: "Browse Files",
      description: "File manager",
      icon: FolderOpen,
      action: () => go("/files"),
    },
    {
      id: "health",
      label: "System Health",
      description: "Service and disk status",
      icon: Activity,
      action: () => go("/health"),
    },
    {
      id: "storage",
      label: "Storage Root",
      description: "/home/luqman/Storage",
      icon: HardDrive,
      action: () => go("/files?path=/"),
    },
    {
      id: "trash",
      label: "Open Trash",
      description: "View and restore deleted files",
      icon: Trash2,
      action: () => go("/trash"),
    },
    {
      id: "ssh",
      label: "Copy SSH Command",
      description: "ssh luqman-server",
      icon: Terminal,
      action: () => {
        navigator.clipboard.writeText("ssh luqman-server");
        close();
      },
    },
  ];

  return [...pinCommands, ...navCommands];
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const commands = useCommands(router, close);

  const filtered = commands.filter(
    (cmd) =>
      !query ||
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(query.toLowerCase()),
  );

  // Global Cmd+K / Ctrl+K toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) {
            setQuery("");
            setSelectedIndex(0);
          }
          return !prev;
        });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input when palette opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Arrow keys + Enter + Escape inside palette
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, filtered, selectedIndex, close]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[18vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Palette */}
      <div className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-xl border border-zinc-800/60 bg-[#0d0e13] shadow-2xl">
        {/* Search bar */}
        <div className="flex items-center gap-3 border-b border-zinc-800/40 px-4 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-zinc-600" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands…"
            className="flex-1 bg-transparent text-[14px] text-zinc-200 outline-none placeholder:text-zinc-600"
          />
          <kbd className="rounded border border-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-[60vh] overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-zinc-600">
              No commands match &ldquo;{query}&rdquo;
            </p>
          ) : (
            filtered.map((cmd, i) => {
              const active = i === selectedIndex;
              const showGroupHeader =
                cmd.group && (i === 0 || filtered[i - 1].group !== cmd.group);
              const isFavorite = cmd.group === "Favorites";
              return (
                <div key={cmd.id}>
                  {showGroupHeader && (
                    <div className="flex items-center gap-1.5 px-4 pb-1 pt-2">
                      <Star className="h-2.5 w-2.5 text-amber-500/50" />
                      <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-700">
                        {cmd.group}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={cmd.action}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      active
                        ? "bg-zinc-800/50"
                        : "hover:bg-zinc-800/25",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                        active
                          ? isFavorite ? "bg-amber-500/15" : "bg-emerald-500/15"
                          : "bg-zinc-800/60",
                      )}
                    >
                      <cmd.icon
                        className={cn(
                          "h-3.5 w-3.5 transition-colors",
                          active
                            ? isFavorite ? "text-amber-400" : "text-emerald-400"
                            : "text-zinc-600",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[13px] transition-colors",
                          active ? "text-zinc-100" : "text-zinc-400",
                        )}
                      >
                        {cmd.label}
                      </p>
                      {cmd.description && (
                        <p className="truncate font-mono text-[11px] text-zinc-700">
                          {cmd.description}
                        </p>
                      )}
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800/30 px-4 py-2.5">
          <div className="flex items-center gap-4">
            {[
              { keys: "↑↓", label: "navigate" },
              { keys: "↵",  label: "open" },
              { keys: "⌘K", label: "close" },
            ].map(({ keys, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-700"
              >
                <kbd className="rounded border border-zinc-800 px-1 py-0.5 font-mono text-[9px]">
                  {keys}
                </kbd>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
