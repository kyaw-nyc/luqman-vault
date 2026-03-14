"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HealthItem } from "@/types/health";
import { StatusPill } from "@/components/ui/status-pill";
import { LogDrawer } from "@/components/health/log-drawer";
import { restartService } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { RotateCw, ScrollText, AlertTriangle, Wifi } from "lucide-react";

// These services kill their own HTTP connection when restarted.
// A network error on restart is NOT a failure — it means the restart fired.
// We poll until the backend comes back rather than showing an immediate error.
const SELF_RESTARTING = new Set(["luqman-vault"]);

// Restarting these may temporarily disconnect the app from the server.
// Show a warning in the confirmation dialog.
const WARN_DISCONNECT = new Set(["tailscaled"]);

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 35_000;

/** Poll /api/ping until the backend responds OK or the timeout expires. */
async function waitForBackend(): Promise<boolean> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const res = await fetch("/api/ping", { cache: "no-store" });
      if (res.ok) return true;
    } catch {
      // still down — keep polling
    }
  }
  return false;
}

const statusBorder = {
  running: "border-l-emerald-500/40",
  stopped: "border-l-red-500/40",
  error: "border-l-red-500/40",
  unknown: "border-l-zinc-600/40",
};

// Per-service restart state:
//   idle        → normal card
//   restarting  → request in-flight, spinner on button
//   recovering  → request dropped (expected), polling backend
type RestartPhase = "restarting" | "recovering";

interface ServicesPanelProps {
  health: HealthItem[];
}

export function ServicesPanel({ health }: ServicesPanelProps) {
  const router = useRouter();
  const [logService, setLogService] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState<string | null>(null);
  const [restartState, setRestartState] = useState<{
    service: string;
    phase: RestartPhase;
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    service: string;
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleRestart = async (serviceName: string) => {
    setConfirmRestart(null);
    setFeedback(null);
    setRestartState({ service: serviceName, phase: "restarting" });

    const isSelfRestarting = SELF_RESTARTING.has(serviceName);

    let shouldPoll = false;

    try {
      await restartService(serviceName);
      // Got a clean HTTP success back from the backend.
      if (isSelfRestarting) {
        // Rare path: backend replied before systemd killed it.
        // Still poll to confirm it actually comes back up.
        shouldPoll = true;
      } else {
        setFeedback({
          service: serviceName,
          type: "success",
          message: `${serviceName} restarted successfully`,
        });
        setRestartState(null);
        setTimeout(() => router.refresh(), 2000);
      }
    } catch {
      if (isSelfRestarting) {
        // Expected: backend killed its own connection mid-restart.
        // This is the normal code path — not an error.
        shouldPoll = true;
      } else {
        setFeedback({
          service: serviceName,
          type: "error",
          message: "Restart failed — check service logs for details",
        });
        setRestartState(null);
      }
    }

    if (shouldPoll) {
      setRestartState({ service: serviceName, phase: "recovering" });
      const recovered = await waitForBackend();
      setRestartState(null);
      if (recovered) {
        setFeedback({
          service: serviceName,
          type: "success",
          message: `${serviceName} restarted and recovered`,
        });
        router.refresh();
      } else {
        setFeedback({
          service: serviceName,
          type: "error",
          message: "Service did not come back within 35 s — check server logs",
        });
      }
    }
  };

  const allRunning = health.every((h) => h.status === "running");

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="mb-0 text-[11px] font-medium uppercase tracking-widest text-zinc-600">
          Services
        </p>
        {allRunning && (
          <span className="text-[11px] font-medium text-emerald-500/70">
            All operational
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {health.map((service) => {
          const rs =
            restartState?.service === service.serviceName ? restartState : null;
          const isRestarting = rs?.phase === "restarting";
          const isRecovering = rs?.phase === "recovering";
          const isBusy = rs !== null;
          const isConfirming = confirmRestart === service.serviceName;
          const fb =
            feedback?.service === service.serviceName ? feedback : null;
          const willWarnDisconnect = WARN_DISCONNECT.has(service.serviceName);

          return (
            <div
              key={service.serviceName}
              className={cn(
                "group rounded-xl border border-zinc-800/40 border-l-2 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-700/40 sm:p-5",
                statusBorder[service.status],
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-[13px] font-medium text-zinc-300">
                  {service.serviceName}
                </h3>
                <StatusPill status={service.status} />
              </div>

              <p className="mt-3 text-[13px] leading-relaxed text-zinc-600">
                {service.details}
              </p>
              <p className="mt-2 font-mono text-[11px] text-zinc-800">
                last checked {formatDate(service.checkedAt)}
              </p>

              {/* Feedback banner */}
              {fb && (
                <p
                  className={cn(
                    "mt-3 rounded-md px-3 py-1.5 text-[11px] font-medium",
                    fb.type === "success"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400",
                  )}
                >
                  {fb.message}
                </p>
              )}

              {/* Recovering state — shown while polling */}
              {isRecovering && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-zinc-700/30 bg-zinc-800/30 px-3 py-2">
                  <RotateCw className="h-3 w-3 shrink-0 animate-spin text-zinc-500" />
                  <p className="text-[11px] text-zinc-500">
                    Waiting for backend to recover…
                  </p>
                </div>
              )}

              {/* Confirmation dialog */}
              {isConfirming && (
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3">
                  <p className="text-[12px] text-amber-300/90">
                    Restart <strong>{service.serviceName}</strong>?
                  </p>

                  {/* Tailscale disconnect warning */}
                  {willWarnDisconnect && (
                    <div className="mt-2 flex items-start gap-2 rounded-md border border-zinc-700/40 bg-zinc-900/60 px-2.5 py-2">
                      <Wifi className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/70" />
                      <p className="text-[11px] leading-relaxed text-zinc-500">
                        Restarting{" "}
                        <span className="text-zinc-400">tailscaled</span> will
                        temporarily disconnect this app from the network. The
                        page may stop responding for a few seconds.
                      </p>
                    </div>
                  )}

                  {/* Self-restarting note */}
                  {SELF_RESTARTING.has(service.serviceName) && (
                    <div className="mt-2 flex items-start gap-2 rounded-md border border-zinc-700/40 bg-zinc-900/60 px-2.5 py-2">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-zinc-600" />
                      <p className="text-[11px] leading-relaxed text-zinc-500">
                        The request will appear to drop — this is normal. The
                        page will poll until the backend recovers.
                      </p>
                    </div>
                  )}

                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() => handleRestart(service.serviceName)}
                      className="rounded-md bg-amber-500/20 px-3 py-1 text-[11px] font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
                    >
                      Confirm restart
                    </button>
                    <button
                      onClick={() => setConfirmRestart(null)}
                      className="rounded-md px-3 py-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!isConfirming && (
                <div className="mt-4 flex gap-2 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                  <button
                    onClick={() => setLogService(service.serviceName)}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-[11px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-40"
                  >
                    <ScrollText className="h-3 w-3" />
                    Logs
                  </button>
                  <button
                    onClick={() => setConfirmRestart(service.serviceName)}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-[11px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-40"
                  >
                    <RotateCw
                      className={cn(
                        "h-3 w-3",
                        isBusy && "animate-spin",
                      )}
                    />
                    {isRestarting
                      ? "Restarting…"
                      : isRecovering
                        ? "Recovering…"
                        : "Restart"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {logService && (
        <LogDrawer
          serviceName={logService}
          onClose={() => setLogService(null)}
        />
      )}
    </>
  );
}
