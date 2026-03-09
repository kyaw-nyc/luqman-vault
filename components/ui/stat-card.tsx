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
        "group rounded-xl border bg-zinc-900/40 p-5 transition-all",
        accent
          ? "border-emerald-500/15 hover:border-emerald-500/25"
          : "border-zinc-800/40 hover:border-zinc-700/40",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
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
          "mt-3 font-mono text-[22px] font-semibold tracking-tight",
          accent ? "text-emerald-400" : "text-zinc-100",
        )}
      >
        {value}
      </p>
    </div>
  );
}
