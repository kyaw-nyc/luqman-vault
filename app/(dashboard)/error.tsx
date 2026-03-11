"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-red-500/20 bg-red-500/[0.03] px-8 py-10 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400/60" />
        <div>
          <h2 className="text-[15px] font-medium text-zinc-200">
            Something went wrong
          </h2>
          <p className="mt-1 max-w-sm text-[13px] text-zinc-500">
            The backend may be unreachable. Check that the server is running and
            try again.
          </p>
        </div>
        <button
          onClick={reset}
          className="mt-2 flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-[13px] text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    </div>
  );
}
