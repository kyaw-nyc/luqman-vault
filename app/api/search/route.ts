import { NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/backend";
import { mockSearch } from "@/lib/mock-data";

const USE_MOCK = process.env.USE_MOCK === "true";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query") ?? "";
  const basePath = req.nextUrl.searchParams.get("basePath") ?? "/";

  if (USE_MOCK) {
    return Response.json(mockSearch(query, basePath));
  }

  try {
    const upstream = await fetch(
      `${BACKEND_URL}/api/search?query=${encodeURIComponent(query)}&basePath=${encodeURIComponent(basePath)}`,
    );
    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch {
    return Response.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
