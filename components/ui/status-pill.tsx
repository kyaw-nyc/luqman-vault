import { cn } from "@/lib/utils";

const statusStyles = {
  running: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
    glow: "shadow-[0_0_6px_rgba(16,185,129,0.5)]",
    label: "Running",
  },
  stopped: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    dot: "bg-red-500",
    glow: "shadow-[0_0_6px_rgba(239,68,68,0.5)]",
    label: "Stopped",
  },
  error: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    dot: "bg-red-500",
    glow: "shadow-[0_0_6px_rgba(239,68,68,0.5)]",
    label: "Error",
  },
  unknown: {
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    dot: "bg-zinc-500",
    glow: "",
    label: "Unknown",
  },
};

export function StatusPill({
  status,
}: {
  status: keyof typeof statusStyles;
}) {
  const s = statusStyles[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        s.bg,
        s.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot, s.glow)} />
      {s.label}
    </span>
  );
}
