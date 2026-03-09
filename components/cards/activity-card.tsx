import type { RecentActivity } from "@/types/stats";
import { formatRelativeTime } from "@/lib/formatters";
import { FileEdit, Upload, FolderPlus, Trash2 } from "lucide-react";

const actionIcons = {
  modified: FileEdit,
  uploaded: Upload,
  created: FolderPlus,
  deleted: Trash2,
};

const actionColors = {
  modified: "text-blue-400/80",
  uploaded: "text-emerald-400/80",
  created: "text-violet-400/80",
  deleted: "text-red-400/80",
};

export function ActivityCard({ activity }: { activity: RecentActivity[] }) {
  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-6">
      <h3 className="mb-5 text-[11px] font-medium uppercase tracking-widest text-zinc-600">
        Recent Activity
      </h3>

      <div className="space-y-0.5">
        {activity.map((item, i) => {
          const Icon = actionIcons[item.action];
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-800/25"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800/50">
                <Icon className={`h-3.5 w-3.5 ${actionColors[item.action]}`} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[13px] text-zinc-300">
                  <span className="font-medium text-zinc-200">
                    {item.fileName}
                  </span>{" "}
                  <span className="text-zinc-600">{item.action}</span>
                </span>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-zinc-700">
                {formatRelativeTime(item.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
