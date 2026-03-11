import type { HealthItem } from "@/types/health";
import type { DiskMetrics, MemoryMetrics } from "@/types/metrics";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle } from "lucide-react";

const DISK_WARNING = 85;
const DISK_CRITICAL = 95;
const MEMORY_WARNING = 90;

interface Alert {
  id: string;
  severity: "warning" | "critical";
  title: string;
  detail: string;
}

function deriveAlerts(
  disk: DiskMetrics | null,
  memory: MemoryMetrics | null,
  health: HealthItem[],
): Alert[] {
  const alerts: Alert[] = [];

  if (disk) {
    if (disk.percentUsed >= DISK_CRITICAL) {
      alerts.push({
        id: "disk-critical",
        severity: "critical",
        title: "Disk almost full",
        detail: `${disk.percentUsed.toFixed(1)}% used — immediate action required`,
      });
    } else if (disk.percentUsed >= DISK_WARNING) {
      alerts.push({
        id: "disk-warning",
        severity: "warning",
        title: "Disk usage high",
        detail: `${disk.percentUsed.toFixed(1)}% used — consider freeing space`,
      });
    }
  }

  if (memory && memory.percentUsed >= MEMORY_WARNING) {
    alerts.push({
      id: "memory-warning",
      severity: "warning",
      title: "Memory pressure",
      detail: `${memory.percentUsed.toFixed(1)}% used`,
    });
  }

  const important = ["luqman-vault", "luqman-vault-frontend", "tailscaled"];
  for (const svc of health) {
    if (important.includes(svc.serviceName) && svc.status !== "running") {
      alerts.push({
        id: `svc-${svc.serviceName}`,
        severity: "critical",
        title: `${svc.serviceName} is ${svc.status}`,
        detail: svc.details,
      });
    }
  }

  for (const svc of health) {
    if (
      !important.includes(svc.serviceName) &&
      svc.status !== "running" &&
      svc.status !== "unknown"
    ) {
      alerts.push({
        id: `svc-${svc.serviceName}`,
        severity: "warning",
        title: `${svc.serviceName} is ${svc.status}`,
        detail: svc.details,
      });
    }
  }

  return alerts;
}

interface AlertBannerProps {
  disk?: DiskMetrics | null;
  memory?: MemoryMetrics | null;
  health: HealthItem[];
}

export function AlertBanner({
  disk = null,
  memory = null,
  health,
}: AlertBannerProps) {
  const alerts = deriveAlerts(disk, memory, health);
  if (alerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3",
            a.severity === "critical"
              ? "border-red-500/20 bg-red-500/5"
              : "border-amber-500/20 bg-amber-500/5",
          )}
        >
          <div className="mt-0.5 shrink-0">
            {a.severity === "critical" ? (
              <AlertCircle className="h-4 w-4 text-red-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            )}
          </div>
          <div className="min-w-0">
            <p
              className={cn(
                "text-[13px] font-medium",
                a.severity === "critical"
                  ? "text-red-300"
                  : "text-amber-300",
              )}
            >
              {a.title}
            </p>
            <p className="mt-0.5 text-[12px] text-zinc-500">{a.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
