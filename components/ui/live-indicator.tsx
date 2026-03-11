"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  /** Milliseconds between router.refresh() calls */
  interval?: number;
  /**
   * Pass Date.now() evaluated server-side so this value changes on every
   * successful server re-render. When the backend is unreachable and the
   * refresh silently fails, this prop stays the same and secondsAgo keeps
   * growing — triggering the stale state.
   */
  serverTimestamp: number;
}

export function LiveIndicator({
  interval = 30_000,
  serverTimestamp,
}: LiveIndicatorProps) {
  const router = useRouter();
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Reset counter every time the server successfully re-renders with new data
  useEffect(() => {
    setSecondsAgo(0);
  }, [serverTimestamp]);

  useEffect(() => {
    const refreshTimer = setInterval(() => router.refresh(), interval);
    const tickTimer = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => {
      clearInterval(refreshTimer);
      clearInterval(tickTimer);
    };
  }, [router, interval]);

  // Stale if no successful update received for > 1.5× the interval
  const staleThreshold = Math.round((interval / 1000) * 1.5) + 5;
  const isStale = secondsAgo > staleThreshold;

  return (
    <div
      className={cn(
        "flex items-center gap-2 font-mono text-[11px] transition-colors",
        isStale ? "text-amber-700/80" : "text-zinc-700",
      )}
      title={isStale ? "Data may be stale — backend unreachable?" : "Auto-refreshing"}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isStale
            ? "bg-amber-500/50"
            : "animate-pulse bg-emerald-500/60",
        )}
      />
      {isStale ? `stale · ${secondsAgo}s ago` : `live · updated ${secondsAgo}s ago`}
    </div>
  );
}
