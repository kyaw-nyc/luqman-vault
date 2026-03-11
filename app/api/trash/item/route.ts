import { NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ detail: "Missing id" }, { status: 400 });

  const upstream = await fetch(
    `${BACKEND_URL}/api/trash/item?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
