"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ResourcePanel } from "@/components/health/resource-panel";
import { formatBytes } from "@/lib/formatters";
import type { LiveMetricsSnapshot, DiskMetrics } from "@/types/metrics";

const FAST_MS = 1_000;   // CPU + memory poll interval
const SLOW_MS = 30_000;  // router.refresh() for slow server data

interface LiveMetricsProps {
  /** Server-rendered initial values — prevents flash on first render */
  initial: LiveMetricsSnapshot;
  /** Storage stats — static prop, updated by the 30s router.refresh() */
  storage: DiskMetrics;
  /** Total memory bytes — never changes, passed as static prop */
  memoryTotal: number;
  /** CPU core count — never changes, passed as static prop */
  cpuCores: number;
}

export function LiveMetrics({
  initial,
  storage,
  memoryTotal,
  cpuCores,
}: LiveMetricsProps) {
  const router = useRouter();
  // Initialized once from server snapshot; updated exclusively by 1s poll.
  // router.refresh() updates `storage` and other slow props via RSC re-render,
  // but does NOT reset this state.
  const [snap, setSnap] = useState<LiveMetricsSnapshot>(initial);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [stale, setStale] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics/live", {
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) throw new Error("non-ok");
      const data: LiveMetricsSnapshot = await res.json();
      setSnap(data);
      setSecondsAgo(0);
      setStale(false);
    } catch {
      setStale(true);
    }
  }, []); // state setters are stable references — no deps needed

  useEffect(() => {
    // Fire immediately so we have live data before the first 1s tick
    poll();
    const fastTimer = setInterval(poll, FAST_MS);
    const tickTimer = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    // Slow refresh: re-runs the server component — updates processes, services,
    // disk usage, alerts, network info without re-fetching fast metrics client-side
    const slowTimer = setInterval(() => router.refresh(), SLOW_MS);
    return () => {
      clearInterval(fastTimer);
      clearInterval(tickTimer);
      clearInterval(slowTimer);
    };
  }, [poll, router]);

  const serverTimeStr = (() => {
    try {
      return new Date(snap.serverTime).toLocaleString("en-US", {
        weekday: "short",
        month:   "short",
        day:     "numeric",
        hour:    "2-digit",
        minute:  "2-digit",
        second:  "2-digit",
        hour12:  false,
      });
    } catch {
      return snap.serverTime;
    }
  })();

  return (
    <div className="mb-8">
      {/* Section header — label left, live status right */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 sm:flex-nowrap sm:items-center">
        <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
          Resource Usage
        </p>
        <div className="flex flex-col items-start gap-0.5 sm:items-end sm:gap-1">
          <div
            className={cn(
              "flex items-center gap-2 font-mono text-[11px] transition-colors",
              stale ? "text-amber-700/80" : "text-zinc-700",
            )}
            title={
              stale
                ? "Data may be stale — backend unreachable?"
                : "Polling every second"
            }
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                stale
                  ? "bg-amber-500/50"
                  : "animate-pulse bg-emerald-500/60",
              )}
            />
            {stale
              ? `stale · ${secondsAgo}s ago`
              : `live · updated ${secondsAgo}s ago`}
          </div>
          <p className="font-mono text-[11px] text-zinc-700">
            server time ·{" "}
            <span className="text-zinc-400">{serverTimeStr}</span>
          </p>
        </div>
      </div>

      {/* Resource panels — CPU and Memory update every 1s, Storage on 30s refresh */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResourcePanel
          title="CPU"
          percent={snap.cpu.percent}
          rows={[
            {
              label: "Load 1m · 5m · 15m",
              value: `${snap.cpu.loadAvg1m} · ${snap.cpu.loadAvg5m} · ${snap.cpu.loadAvg15m}`,
            },
            { label: "Cores", value: `${cpuCores} logical` },
          ]}
        />
        <ResourcePanel
          title="Memory"
          percent={snap.memory.percentUsed}
          rows={[
            { label: "Total",     value: formatBytes(memoryTotal) },
            { label: "Used",      value: formatBytes(snap.memory.usedBytes) },
            { label: "Available", value: formatBytes(snap.memory.availableBytes) },
          ]}
        />
        <ResourcePanel
          title="Storage"
          percent={storage.percentUsed}
          rows={[
            { label: "Total", value: formatBytes(storage.totalBytes) },
            { label: "Used",  value: formatBytes(storage.usedBytes) },
            { label: "Free",  value: formatBytes(storage.freeBytes) },
          ]}
        />
      </div>
    </div>
  );
}
