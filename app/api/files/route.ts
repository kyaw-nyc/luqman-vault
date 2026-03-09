import { NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") ?? "/";
  const upstream = await fetch(
    `${BACKEND_URL}/api/files?path=${encodeURIComponent(path)}`,
  );
  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
