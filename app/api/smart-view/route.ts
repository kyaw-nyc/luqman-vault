import { BACKEND_URL } from "@/lib/backend";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "";
  const upstream = await fetch(
    `${BACKEND_URL}/api/smart-view?type=${encodeURIComponent(type)}`,
  );
  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
