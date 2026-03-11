import { BACKEND_URL } from "@/lib/backend";

export async function GET() {
  const upstream = await fetch(`${BACKEND_URL}/api/trash`);
  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
