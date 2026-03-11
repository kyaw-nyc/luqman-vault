"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { TerminalSquare, AlertTriangle, Shield, FolderOpen } from "lucide-react";

const TerminalView = dynamic(
  () =>
    import("@/components/terminal/terminal-view").then((m) => m.TerminalView),
  { ssr: false },
);

export default function TerminalPage() {
  const [accepted, setAccepted] = useState(false);

  if (!accepted) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <TerminalSquare className="h-7 w-7 text-amber-400" />
          </div>

          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-zinc-100">
              Server Terminal
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
              Opens a real shell session on the server. Every command runs
              immediately — this is not a sandbox.
            </p>
          </div>

          <div className="space-y-2.5 text-left">
            <div className="flex items-start gap-3 rounded-lg border border-zinc-800/40 bg-zinc-900/40 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/70" />
              <div className="text-[12px] leading-relaxed text-zinc-400">
                <p>
                  Destructive commands execute immediately on the real server.
                </p>
                <p className="mt-1 text-zinc-600">
                  There is no undo, no confirmation, and no rollback.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-zinc-800/40 bg-zinc-900/40 px-4 py-3">
              <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
              <div className="text-[12px] leading-relaxed text-zinc-400">
                <p>
                  Shell starts in{" "}
                  <code className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[11px] text-zinc-300">
                    /home/luqman/Storage
                  </code>
                </p>
                <p className="mt-1 text-zinc-600">
                  Runs as the backend service user. Session auto-disconnects
                  after 15 minutes of inactivity.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-zinc-800/40 bg-zinc-900/40 px-4 py-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500/70" />
              <p className="text-[12px] leading-relaxed text-zinc-400">
                Access is restricted to your private Tailscale network. No
                public exposure.
              </p>
            </div>
          </div>

          <button
            onClick={() => setAccepted(true)}
            className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-[13px] font-medium text-amber-300 transition-colors hover:bg-amber-500/20 active:bg-amber-500/25"
          >
            I understand — open terminal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-5 -mb-6 -mt-2 flex flex-col md:-mx-10 md:-mb-10 md:-mt-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/40 px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-amber-400" />
          <span className="font-mono text-[12px] font-medium text-zinc-300">
            terminal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 font-mono text-[10px] font-medium text-amber-400/70">
            live · advanced
          </span>
        </div>
      </div>

      {/* Terminal fills remaining viewport */}
      <div className="flex-1" style={{ height: "calc(100vh - 110px)" }}>
        <TerminalView />
      </div>
    </div>
  );
}
