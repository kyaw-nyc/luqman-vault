import type { RecentActivity } from "@/types/stats";
import { formatRelativeTime } from "@/lib/formatters";
import {
  FileEdit,
  Upload,
  FolderPlus,
  Trash2,
  Download,
  Pencil,
  ArrowRight,
} from "lucide-react";

const actionConfig: Record<
  RecentActivity["action"],
  { icon: typeof FileEdit; color: string; label: string }
> = {
  modified:   { icon: FileEdit,   color: "text-blue-400/80",    label: "modified"   },
  uploaded:   { icon: Upload,     color: "text-emerald-400/80", label: "uploaded"   },
  created:    { icon: FolderPlus, color: "text-violet-400/80",  label: "created"    },
  deleted:    { icon: Trash2,     color: "text-red-400/80",     label: "deleted"    },
  downloaded: { icon: Download,   color: "text-sky-400/80",     label: "downloaded" },
  renamed:    { icon: Pencil,     color: "text-amber-400/80",   label: "renamed"    },
  moved:      { icon: ArrowRight, color: "text-indigo-400/80",  label: "moved"      },
};

export function ActivityCard({ activity }: { activity: RecentActivity[] }) {
  if (activity.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-6">
        <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-zinc-600">
          Recent Activity
        </h3>
        <p className="text-[13px] text-zinc-700">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-4 sm:p-6">
      <h3 className="mb-4 text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:mb-5 sm:text-[11px]">
        Recent Activity
      </h3>

      <div className="space-y-0.5">
        {activity.map((item, i) => {
          const cfg = actionConfig[item.action] ?? actionConfig.modified;
          const Icon = cfg.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-800/25 sm:gap-3 sm:px-3 sm:py-2.5"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800/50">
                <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px]">
                  <span className="font-medium text-zinc-200">{item.fileName}</span>{" "}
                  <span className="text-zinc-600">{cfg.label}</span>
                </p>
                <p className="truncate font-mono text-[10px] text-zinc-700 sm:text-[11px]">
                  {item.path}
                </p>
              </div>
              <span className="hidden shrink-0 font-mono text-[11px] text-zinc-700 sm:inline">
                {formatRelativeTime(item.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
