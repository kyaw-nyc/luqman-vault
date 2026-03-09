import { NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");

  if (!path) {
    return new Response("Missing path", { status: 400 });
  }

  const inline = req.nextUrl.searchParams.get("inline") === "1";
  const upstream = await fetch(
    `${BACKEND_URL}/api/download?path=${encodeURIComponent(path)}${inline ? "&inline=1" : ""}`,
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
