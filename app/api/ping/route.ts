import { BACKEND_URL } from "@/lib/backend";

export const dynamic = "force-dynamic";

/**
 * Lightweight liveness probe.
 * Client-side polling uses this after a self-restarting service drops its
 * own connection — we need a same-origin endpoint so the browser can check
 * whether the backend has come back without touching it directly.
 */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return Response.json({ ok: res.ok }, { status: res.ok ? 200 : 503 });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
