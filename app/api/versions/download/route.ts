import { BACKEND_URL } from "@/lib/backend";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const upstream = await fetch(
    `${BACKEND_URL}/api/versions/download?id=${encodeURIComponent(id)}`,
  );

  if (!upstream.ok) {
    return Response.json({ detail: "Version not found" }, { status: upstream.status });
  }

  const blob = await upstream.blob();
  const headers = new Headers();
  const cd = upstream.headers.get("content-disposition");
  if (cd) headers.set("content-disposition", cd);
  headers.set("content-type", upstream.headers.get("content-type") ?? "application/octet-stream");

  return new Response(blob, { status: 200, headers });
}
