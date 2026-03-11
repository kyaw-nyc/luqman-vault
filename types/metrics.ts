export interface CpuMetrics {
  percent: number;
  loadAvg1m: number;
  loadAvg5m: number;
  loadAvg15m: number;
  cores: number;
}

export interface MemoryMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  availableBytes: number;
  percentUsed: number;
}

export interface DiskMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  percentUsed: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpuPercent: number;
  memoryPercent: number;
}

export interface SystemMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  uptime: string;
  hostname: string;
  serverTime: string;
  os: {
    system: string;
    kernel: string;
  };
  topByCpu: ProcessInfo[];
  topByMemory: ProcessInfo[];
  network: {
    primaryInterface: string | null;
    localIp: string | null;
    tailscaleIp: string | null;
  };
  temperature: {
    available: boolean;
    value: number | null;
  };
}
