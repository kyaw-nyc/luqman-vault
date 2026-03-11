import { BACKEND_URL } from "@/lib/backend";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") ?? "";
  const upstream = await fetch(
    `${BACKEND_URL}/api/versions?path=${encodeURIComponent(path)}`,
  );
  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
