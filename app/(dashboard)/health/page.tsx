import { getHealth, getMetrics } from "@/lib/api";
import { formatBytes } from "@/lib/formatters";
import { ResourcePanel } from "@/components/health/resource-panel";
import { ServicesPanel } from "@/components/health/services-panel";
import { AlertBanner } from "@/components/health/alert-banner";
import { LiveIndicator } from "@/components/ui/live-indicator";
import type { ProcessInfo } from "@/types/metrics";
import { Server, Cpu, Clock, Thermometer } from "lucide-react";

export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, suffix = ""): string {
  if (n == null) return "—";
  return `${n}${suffix}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-zinc-600">
      {children}
    </p>
  );
}

function InfoChip({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-800/40 bg-zinc-900/30 px-4 py-3">
      <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-700">
        {label}
      </span>
      <span className="font-mono text-[13px] text-zinc-300">
        {value ?? "—"}
      </span>
    </div>
  );
}

function ProcessTable({
  title,
  processes,
}: {
  title: string;
  processes: ProcessInfo[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-6">
      <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-zinc-600">
        {title}
      </p>
      {processes.length === 0 ? (
        <p className="text-[13px] text-zinc-700">No data available</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800/40">
              <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-700">
                PID
              </th>
              <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-700">
                Name
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-widest text-zinc-700">
                CPU
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-widest text-zinc-700">
                Mem
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/20">
            {processes.map((p) => (
              <tr key={p.pid} className="group">
                <td className="py-2.5 font-mono text-[11px] text-zinc-700">
                  {p.pid}
                </td>
                <td className="py-2.5 font-mono text-[13px] text-zinc-300 group-first:text-zinc-100">
                  {p.name}
                </td>
                <td className="py-2.5 text-right font-mono text-[12px] text-zinc-400">
                  {p.cpuPercent.toFixed(1)}%
                </td>
                <td className="py-2.5 text-right font-mono text-[12px] text-zinc-400">
                  {p.memoryPercent.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HealthPage() {
  const [health, metrics] = await Promise.all([getHealth(), getMetrics()]);

  const serverTimeStr = (() => {
    try {
      return new Date(metrics.serverTime).toLocaleString("en-US", {
        weekday: "short",
        month:   "short",
        day:     "numeric",
        hour:    "2-digit",
        minute:  "2-digit",
        second:  "2-digit",
        hour12:  false,
      });
    } catch {
      return metrics.serverTime;
    }
  })();

  return (
    <>
      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      <AlertBanner
        disk={metrics.disk}
        memory={metrics.memory}
        health={health}
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50">
            System Health
          </h1>
          <p className="mt-1.5 text-[13px] text-zinc-500">
            Real-time server monitoring
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <LiveIndicator
            interval={10_000}
            serverTimestamp={new Date(metrics.serverTime).getTime()}
          />
          <p className="font-mono text-[11px] text-zinc-700">server time</p>
          <p className="font-mono text-[13px] text-zinc-400">{serverTimeStr}</p>
        </div>
      </div>

      {/* ── System Overview ──────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Hostname */}
        <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-700/40">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
              Hostname
            </p>
            <Server className="h-3.5 w-3.5 text-zinc-700" />
          </div>
          <p className="font-mono text-[18px] font-semibold tracking-tight text-zinc-100">
            {metrics.hostname}
          </p>
        </div>

        {/* Kernel */}
        <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-700/40">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
              Kernel
            </p>
            <Cpu className="h-3.5 w-3.5 text-zinc-700" />
          </div>
          <p className="font-mono text-[13px] font-semibold text-zinc-100 leading-snug">
            {metrics.os.kernel}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-600">
            {metrics.os.system} · {metrics.cpu.cores}c
          </p>
        </div>

        {/* Uptime */}
        <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-700/40">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
              Uptime
            </p>
            <Clock className="h-3.5 w-3.5 text-zinc-700" />
          </div>
          <p className="font-mono text-[18px] font-semibold tracking-tight text-zinc-100">
            {metrics.uptime}
          </p>
        </div>

        {/* Temperature or load */}
        <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-700/40">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
              {metrics.temperature.available ? "Temperature" : "Load Avg"}
            </p>
            <Thermometer className="h-3.5 w-3.5 text-zinc-700" />
          </div>
          {metrics.temperature.available && metrics.temperature.value != null ? (
            <>
              <p className="font-mono text-[18px] font-semibold tracking-tight text-zinc-100">
                {metrics.temperature.value}°C
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-zinc-600">
                peak sensor reading
              </p>
            </>
          ) : (
            <>
              <p className="font-mono text-[18px] font-semibold tracking-tight text-zinc-100">
                {metrics.cpu.loadAvg1m.toFixed(2)}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-zinc-600">
                {metrics.cpu.loadAvg5m.toFixed(2)} · {metrics.cpu.loadAvg15m.toFixed(2)} avg
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Resource Usage ───────────────────────────────────────────────── */}
      <SectionLabel>Resource Usage</SectionLabel>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResourcePanel
          title="CPU"
          percent={metrics.cpu.percent}
          rows={[
            { label: "Load 1m · 5m · 15m", value: `${metrics.cpu.loadAvg1m} · ${metrics.cpu.loadAvg5m} · ${metrics.cpu.loadAvg15m}` },
            { label: "Cores",              value: `${metrics.cpu.cores} logical` },
          ]}
        />
        <ResourcePanel
          title="Memory"
          percent={metrics.memory.percentUsed}
          rows={[
            { label: "Total",     value: formatBytes(metrics.memory.totalBytes) },
            { label: "Used",      value: formatBytes(metrics.memory.usedBytes) },
            { label: "Available", value: formatBytes(metrics.memory.availableBytes) },
          ]}
        />
        <ResourcePanel
          title="Storage"
          percent={metrics.disk.percentUsed}
          rows={[
            { label: "Total", value: formatBytes(metrics.disk.totalBytes) },
            { label: "Used",  value: formatBytes(metrics.disk.usedBytes) },
            { label: "Free",  value: formatBytes(metrics.disk.freeBytes) },
          ]}
        />
      </div>

      {/* ── Services (interactive: logs + restart) ────────────────────── */}
      <div className="mb-8">
        <ServicesPanel health={health} />
      </div>

      {/* ── Top Processes ────────────────────────────────────────────────── */}
      <SectionLabel>Top Processes</SectionLabel>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ProcessTable title="By CPU" processes={metrics.topByCpu} />
        <ProcessTable title="By Memory" processes={metrics.topByMemory} />
      </div>

      {/* ── Network & Runtime ────────────────────────────────────────────── */}
      <SectionLabel>Network & Runtime</SectionLabel>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoChip
          label="Interface"
          value={metrics.network.primaryInterface}
        />
        <InfoChip
          label="Local IP"
          value={metrics.network.localIp}
        />
        <InfoChip
          label="Tailscale IP"
          value={metrics.network.tailscaleIp}
        />
        <InfoChip
          label="Backend"
          value="Reachable"
        />
      </div>
    </>
  );
}
