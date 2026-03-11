import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: boolean;
}

export function StatCard({ label, value, icon: Icon, accent }: StatCardProps) {
  return (
    <div
      className={cn(
        "group rounded-xl border bg-zinc-900/40 p-3.5 transition-all sm:p-5",
        accent
          ? "border-emerald-500/15 hover:border-emerald-500/25"
          : "border-zinc-800/40 hover:border-zinc-700/40",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:text-[11px]">
          {label}
        </p>
        <Icon
          className={cn(
            "h-3.5 w-3.5 transition-colors",
            accent
              ? "text-emerald-500/50 group-hover:text-emerald-500/70"
              : "text-zinc-700 group-hover:text-zinc-600",
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2 truncate font-mono text-[18px] font-semibold tracking-tight sm:mt-3 sm:text-[22px]",
          accent ? "text-emerald-400" : "text-zinc-100",
        )}
      >
        {value}
      </p>
    </div>
  );
}
