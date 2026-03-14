import { getHealth, getMetrics } from "@/lib/api";
import { ServicesPanel } from "@/components/health/services-panel";
import { AlertBanner } from "@/components/health/alert-banner";
import { LiveMetrics } from "@/components/health/live-metrics";
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
    <div className="flex flex-col gap-0.5 rounded-lg border border-zinc-800/40 bg-zinc-900/30 px-3 py-2.5 sm:gap-1 sm:px-4 sm:py-3">
      <span className="text-[9px] font-medium uppercase tracking-widest text-zinc-700 sm:text-[10px]">
        {label}
      </span>
      <span className="truncate font-mono text-[12px] text-zinc-300 sm:text-[13px]">
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
  const safe = Array.isArray(processes)
    ? processes.filter(
        (p) =>
          p != null &&
          typeof p.pid === "number" &&
          typeof p.name === "string",
      )
    : [];
  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-4 sm:p-6">
      <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:mb-4 sm:text-[11px]">
        {title}
      </p>
      {safe.length === 0 ? (
        <p className="text-[13px] text-zinc-700">No data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/40">
                <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-700 max-sm:hidden">
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
              {safe.map((p) => {
                const cpu = Number(p.cpuPercent);
                const mem = Number(p.memoryPercent);
                return (
                <tr key={p.pid} className="group">
                  <td className="py-2 font-mono text-[11px] text-zinc-700 max-sm:hidden sm:py-2.5">
                    {p.pid}
                  </td>
                  <td className="max-w-[140px] truncate py-2 font-mono text-[12px] text-zinc-300 group-first:text-zinc-100 sm:max-w-none sm:py-2.5 sm:text-[13px]">
                    {p.name}
                  </td>
                  <td className="py-2 text-right font-mono text-[11px] text-zinc-400 sm:py-2.5 sm:text-[12px]">
                    {Number.isFinite(cpu) ? `${cpu.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2 text-right font-mono text-[11px] text-zinc-400 sm:py-2.5 sm:text-[12px]">
                    {Number.isFinite(mem) ? `${mem.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HealthPage() {
  const [health, metrics] = await Promise.all([getHealth(), getMetrics()]);

  // Extract the fast-changing snapshot for LiveMetrics initial render.
  // The client component takes over from here and polls every 1s.
  const liveSnapshot = {
    cpu: {
      percent:    metrics.cpu.percent,
      loadAvg1m:  metrics.cpu.loadAvg1m,
      loadAvg5m:  metrics.cpu.loadAvg5m,
      loadAvg15m: metrics.cpu.loadAvg15m,
    },
    memory: {
      usedBytes:      metrics.memory.usedBytes,
      availableBytes: metrics.memory.availableBytes,
      percentUsed:    metrics.memory.percentUsed,
    },
    temperature: metrics.temperature,
    serverTime:  metrics.serverTime,
  };

  return (
    <>
      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      <AlertBanner
        disk={metrics.disk}
        memory={metrics.memory}
        health={health}
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 sm:mb-10">
        <h1 className="text-[20px] font-semibold tracking-tight text-zinc-50 sm:text-[22px]">
          System Health
        </h1>
        <p className="mt-1 text-[12px] text-zinc-500 sm:mt-1.5 sm:text-[13px]">
          Real-time server monitoring
        </p>
      </div>

      {/* ── System Overview ──────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:mb-8 sm:grid-cols-4 sm:gap-3">
        {/* Hostname */}
        <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-3.5 transition-colors hover:border-zinc-700/40 sm:p-5">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:text-[11px]">
              Hostname
            </p>
            <Server className="h-3.5 w-3.5 text-zinc-700" />
          </div>
          <p className="truncate font-mono text-[15px] font-semibold tracking-tight text-zinc-100 sm:text-[18px]">
            {metrics.hostname}
          </p>
        </div>

        {/* Kernel */}
        <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-3.5 transition-colors hover:border-zinc-700/40 sm:p-5">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:text-[11px]">
              Kernel
            </p>
            <Cpu className="h-3.5 w-3.5 text-zinc-700" />
          </div>
          <p className="truncate font-mono text-[12px] font-semibold text-zinc-100 leading-snug sm:text-[13px]">
            {metrics.os.kernel}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-600 sm:text-[11px]">
            {metrics.os.system} · {metrics.cpu.cores}c
          </p>
        </div>

        {/* Uptime */}
        <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-3.5 transition-colors hover:border-zinc-700/40 sm:p-5">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:text-[11px]">
              Uptime
            </p>
            <Clock className="h-3.5 w-3.5 text-zinc-700" />
          </div>
          <p className="font-mono text-[15px] font-semibold tracking-tight text-zinc-100 sm:text-[18px]">
            {metrics.uptime}
          </p>
        </div>

        {/* Temperature or load */}
        <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-3.5 transition-colors hover:border-zinc-700/40 sm:p-5">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:text-[11px]">
              {metrics.temperature.available ? "Temp" : "Load Avg"}
            </p>
            <Thermometer className="h-3.5 w-3.5 text-zinc-700" />
          </div>
          {metrics.temperature?.available && metrics.temperature?.value != null ? (
            <>
              <p className="font-mono text-[15px] font-semibold tracking-tight text-zinc-100 sm:text-[18px]">
                {metrics.temperature.value}°C
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-zinc-600 sm:text-[11px]">
                peak sensor
              </p>
            </>
          ) : (
            <>
              <p className="font-mono text-[15px] font-semibold tracking-tight text-zinc-100 sm:text-[18px]">
                {Number.isFinite(metrics.cpu?.loadAvg1m) ? metrics.cpu.loadAvg1m.toFixed(2) : "—"}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-zinc-600 sm:text-[11px]">
                {Number.isFinite(metrics.cpu?.loadAvg5m) ? metrics.cpu.loadAvg5m.toFixed(2) : "—"} · {Number.isFinite(metrics.cpu?.loadAvg15m) ? metrics.cpu.loadAvg15m.toFixed(2) : "—"}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Resource Usage (live — polls every 1s, triggers 30s router.refresh) */}
      <LiveMetrics
        initial={liveSnapshot}
        storage={metrics.disk}
        memoryTotal={metrics.memory.totalBytes}
        cpuCores={metrics.cpu.cores}
      />

      {/* ── Services (interactive: logs + restart) ────────────────────── */}
      <div className="mb-8">
        <ServicesPanel health={health} />
      </div>

      {/* ── Top Processes ────────────────────────────────────────────────── */}
      <SectionLabel>Top Processes</SectionLabel>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ProcessTable title="By CPU" processes={Array.isArray(metrics.topByCpu) ? metrics.topByCpu : []} />
        <ProcessTable title="By Memory" processes={Array.isArray(metrics.topByMemory) ? metrics.topByMemory : []} />
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
