import { type NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

export async function GET(req: NextRequest) {
  const service = req.nextUrl.searchParams.get("service") ?? "";
  const lines   = req.nextUrl.searchParams.get("lines")   ?? "100";
  try {
    const upstream = await fetch(
      `${BACKEND_URL}/api/logs?service=${encodeURIComponent(service)}&lines=${encodeURIComponent(lines)}`,
      { cache: "no-store" },
    );
    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch {
    return Response.json({ detail: "Backend unavailable" }, { status: 503 });
  }
}
