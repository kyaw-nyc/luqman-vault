import { BACKEND_URL } from "@/lib/backend";
import { mockGetMetrics } from "@/lib/mock-data";

const USE_MOCK = process.env.USE_MOCK === "true";

export const dynamic = "force-dynamic";

export async function GET() {
  if (USE_MOCK) {
    const m = mockGetMetrics();
    return Response.json({
      cpu: {
        percent:    m.cpu.percent,
        loadAvg1m:  m.cpu.loadAvg1m,
        loadAvg5m:  m.cpu.loadAvg5m,
        loadAvg15m: m.cpu.loadAvg15m,
      },
      memory: {
        usedBytes:      m.memory.usedBytes,
        availableBytes: m.memory.availableBytes,
        percentUsed:    m.memory.percentUsed,
      },
      temperature: m.temperature,
      serverTime: new Date().toISOString(),
    });
  }
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/metrics/live`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch {
    return Response.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
