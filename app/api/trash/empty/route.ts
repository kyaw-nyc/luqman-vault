import { BACKEND_URL } from "@/lib/backend";

export async function DELETE() {
  const upstream = await fetch(`${BACKEND_URL}/api/trash/empty`, {
    method: "DELETE",
  });
  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
