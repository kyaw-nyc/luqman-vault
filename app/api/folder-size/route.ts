import { NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/backend";
import { mockFolderSize } from "@/lib/mock-data";

const USE_MOCK = process.env.USE_MOCK === "true";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") ?? "/";

  if (USE_MOCK) {
    return Response.json(mockFolderSize(path));
  }

  try {
    const upstream = await fetch(
      `${BACKEND_URL}/api/folder-size?path=${encodeURIComponent(path)}`,
    );
    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch {
    return Response.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
