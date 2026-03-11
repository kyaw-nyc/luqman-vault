"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Activity, Server, Trash2, Bookmark, TerminalSquare, BarChart3, Clock, HardDrive, Image, FileText, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePins } from "@/hooks/use-pins";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/files",     label: "Files",     icon: FolderOpen      },
  { href: "/health",    label: "Health",    icon: Activity         },
  { href: "/analytics", label: "Analytics", icon: BarChart3        },
  { href: "/trash",     label: "Trash",     icon: Trash2           },
];

export function Sidebar() {
  const pathname = usePathname();
  const { pins } = usePins();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col border-r border-zinc-800/40 bg-[#0a0b0f] md:flex">
      <div className="flex items-center gap-3 px-6 pb-6 pt-7">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <Server className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-[13px] font-semibold tracking-wide text-zinc-200">
            LUQMAN VAULT
          </span>
          <span className="font-mono text-[10px] text-zinc-600">v0.1.0</span>
        </div>
      </div>

      <div className="mx-5 border-t border-zinc-800/40" />

      <nav className="flex-1 overflow-y-auto space-y-0.5 px-3 pt-5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all",
                isActive
                  ? "bg-zinc-800/50 font-medium text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-800/25 hover:text-zinc-300",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? item.href === "/trash" ? "text-red-400/70" : "text-emerald-400"
                    : "text-zinc-600 group-hover:text-zinc-400",
                )}
              />
              {item.label}
            </Link>
          );
        })}

        {/* Views */}
        <div className="mt-5">
          <div className="px-3 pb-1.5">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-700">
              Views
            </span>
          </div>
          {[
            { href: "/views/recent", label: "Recent", icon: Clock },
            { href: "/views/large", label: "Large Files", icon: HardDrive },
            { href: "/views/images", label: "Images", icon: Image },
            { href: "/views/documents", label: "Documents", icon: FileText },
            { href: "/views/versioned", label: "Versioned", icon: History },
          ].map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-1.5 text-[12px] transition-all",
                  isActive
                    ? "bg-zinc-800/50 font-medium text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-800/25 hover:text-zinc-300",
                )}
              >
                <item.icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-colors",
                    isActive ? "text-emerald-400" : "text-zinc-700 group-hover:text-zinc-500",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Advanced */}
        <div className="mt-5">
          <div className="px-3 pb-1.5">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-700">
              Advanced
            </span>
          </div>
          <Link
            href="/terminal"
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all",
              pathname === "/terminal"
                ? "bg-zinc-800/50 font-medium text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-800/25 hover:text-zinc-300",
            )}
          >
            <TerminalSquare
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                pathname === "/terminal"
                  ? "text-amber-400"
                  : "text-zinc-600 group-hover:text-zinc-400",
              )}
            />
            Terminal
          </Link>
        </div>

        {/* Pinned folders */}
        {pins.length > 0 && (
          <div className="mt-5">
            <div className="px-3 pb-1.5">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-700">
                Pinned
              </span>
            </div>
            {pins.map((pin) => {
              const isActive = pathname.startsWith("/files") &&
                new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("path") === pin.path;
              return (
                <Link
                  key={pin.path}
                  href={`/files?path=${encodeURIComponent(pin.path)}`}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all",
                    "text-zinc-500 hover:bg-zinc-800/25 hover:text-zinc-300",
                  )}
                >
                  <Bookmark className="h-3.5 w-3.5 shrink-0 text-zinc-700 group-hover:text-zinc-500" />
                  <span className="truncate">{pin.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-zinc-800/40 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono text-[11px] text-zinc-500">online</span>
          </div>
          <span className="font-mono text-[11px] text-zinc-700">
            luqman-server
          </span>
        </div>
      </div>
    </aside>
  );
}
