"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Activity, TerminalSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, accent: "emerald" as const },
  { href: "/files",     label: "Files",     icon: FolderOpen,      accent: "emerald" as const },
  { href: "/health",    label: "Health",    icon: Activity,        accent: "emerald" as const },
  { href: "/terminal",  label: "Terminal",  icon: TerminalSquare,  accent: "amber"   as const },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/40 bg-[#0a0b0f] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "?");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-center transition-colors"
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive
                    ? item.accent === "amber" ? "text-amber-400" : "text-emerald-400"
                    : "text-zinc-600",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide transition-colors",
                  isActive ? "text-zinc-200" : "text-zinc-600",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
