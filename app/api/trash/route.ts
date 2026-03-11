import { BACKEND_URL } from "@/lib/backend";

export async function GET() {
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/trash`);
    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch {
    return Response.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
