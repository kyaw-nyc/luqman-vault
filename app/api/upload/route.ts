import { NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const upstream = await fetch(`${BACKEND_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });
  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
