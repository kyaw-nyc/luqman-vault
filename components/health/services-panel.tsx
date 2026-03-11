"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HealthItem } from "@/types/health";
import { StatusPill } from "@/components/ui/status-pill";
import { LogDrawer } from "@/components/health/log-drawer";
import { restartService } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { RotateCw, ScrollText } from "lucide-react";

const statusBorder = {
  running: "border-l-emerald-500/40",
  stopped: "border-l-red-500/40",
  error: "border-l-red-500/40",
  unknown: "border-l-zinc-600/40",
};

interface ServicesPanelProps {
  health: HealthItem[];
}

export function ServicesPanel({ health }: ServicesPanelProps) {
  const router = useRouter();
  const [logService, setLogService] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState<string | null>(null);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    service: string;
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleRestart = async (serviceName: string) => {
    setConfirmRestart(null);
    setRestarting(serviceName);
    setFeedback(null);
    try {
      await restartService(serviceName);
      setFeedback({
        service: serviceName,
        type: "success",
        message: `${serviceName} restarted successfully`,
      });
      setTimeout(() => router.refresh(), 2000);
    } catch (e) {
      setFeedback({
        service: serviceName,
        type: "error",
        message: e instanceof Error ? e.message : "Restart failed",
      });
    } finally {
      setRestarting(null);
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
          const isConfirming = confirmRestart === service.serviceName;
          const isRestarting = restarting === service.serviceName;
          const fb =
            feedback?.service === service.serviceName ? feedback : null;

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

              {isConfirming && (
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3">
                  <p className="text-[12px] text-amber-300/90">
                    Restart <strong>{service.serviceName}</strong>?
                  </p>
                  <div className="mt-2 flex gap-2">
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

              {!isConfirming && (
                <div className="mt-4 flex gap-2 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                  <button
                    onClick={() => setLogService(service.serviceName)}
                    className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-[11px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
                  >
                    <ScrollText className="h-3 w-3" />
                    Logs
                  </button>
                  <button
                    onClick={() => setConfirmRestart(service.serviceName)}
                    disabled={isRestarting}
                    className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-[11px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-40"
                  >
                    <RotateCw
                      className={cn(
                        "h-3 w-3",
                        isRestarting && "animate-spin",
                      )}
                    />
                    {isRestarting ? "Restarting…" : "Restart"}
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
