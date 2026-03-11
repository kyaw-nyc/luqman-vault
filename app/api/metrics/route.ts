import { BACKEND_URL } from "@/lib/backend";
import { mockGetMetrics } from "@/lib/mock-data";

const USE_MOCK = process.env.USE_MOCK === "true";

export async function GET() {
  if (USE_MOCK) {
    return Response.json(mockGetMetrics());
  }
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/metrics`);
    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch {
    return Response.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
