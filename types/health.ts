export interface HealthItem {
  serviceName: string;
  status: "running" | "stopped" | "error" | "unknown";
  details: string;
  checkedAt: string;
}

export interface SystemInfo {
  hostname: string;
  uptime: string;
  backendReachable: boolean;
}
