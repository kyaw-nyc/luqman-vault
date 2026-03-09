import { NextRequest } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://luqman-server:3001";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");

  if (!path) {
    return new Response("Missing path", { status: 400 });
  }

  const upstream = await fetch(
    `${API_BASE}/api/download?path=${encodeURIComponent(path)}`,
  );

  if (!upstream.ok) {
    return new Response("File not found", { status: upstream.status });
  }

  const disposition = upstream.headers.get("content-disposition") ?? "";
  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";

  return new Response(upstream.body, {
    headers: {
      "content-type": contentType,
      "content-disposition": disposition,
    },
  });
}
