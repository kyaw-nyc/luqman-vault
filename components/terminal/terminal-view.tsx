"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Unplug } from "lucide-react";

type Status = "connecting" | "connected" | "disconnected" | "error";

function closeReason(code: number | undefined, fallback: string): string {
  switch (code) {
    case 4000:
      return "Disconnected due to inactivity (15 min timeout)";
    case 4001:
      return "Shell process exited";
    case 4002:
      return "Backend connection failed — is the backend service running?";
    default:
      return fallback;
  }
}

export function TerminalView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [message, setMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(async () => {
    const el = containerRef.current;
    if (!el || !mountedRef.current) return;

    el.innerHTML = "";
    setStatus("connecting");
    setMessage(null);

    const [{ Terminal }, { FitAddon }] = await Promise.all([
      import("@xterm/xterm"),
      import("@xterm/addon-fit"),
    ]);

    if (!mountedRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily:
        "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', monospace",
      allowProposedApi: true,
      scrollback: 5000,
      theme: {
        background: "#08090d",
        foreground: "#a1a1aa",
        cursor: "#10b981",
        cursorAccent: "#08090d",
        selectionBackground: "rgba(16, 185, 129, 0.2)",
        selectionForeground: "#fafafa",
        black: "#08090d",
        red: "#ef4444",
        green: "#10b981",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e4e4e7",
        brightBlack: "#3f3f46",
        brightRed: "#f87171",
        brightGreen: "#34d399",
        brightYellow: "#fde047",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#fafafa",
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${proto}//${window.location.host}/ws/terminal`,
    );
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setStatus("connected");
      setMessage(null);
      const dims = fit.proposeDimensions();
      if (dims) {
        ws.send(
          `\x01resize:${JSON.stringify({ rows: dims.rows, cols: dims.cols })}`,
        );
      }
    };

    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(e.data));
      } else {
        term.write(e.data);
      }
    };

    ws.onclose = (e) => {
      wsRef.current = null;
      if (!mountedRef.current) return;
      const reason = closeReason(e.code, "Session ended");
      setMessage(reason);
      setStatus("disconnected");
      term.write(`\r\n\x1b[2m[${reason}]\x1b[0m\r\n`);
    };

    ws.onerror = () => {
      wsRef.current = null;
      if (!mountedRef.current) return;
      setMessage(
        "Could not connect — check that the backend is running and WebSocket support is enabled.",
      );
      setStatus("error");
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });

    term.onBinary((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        const bytes = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
        ws.send(bytes);
      }
    });

    const sendResize = () => {
      fit.fit();
      const dims = fit.proposeDimensions();
      if (dims && ws.readyState === WebSocket.OPEN) {
        ws.send(
          `\x01resize:${JSON.stringify({ rows: dims.rows, cols: dims.cols })}`,
        );
      }
    };

    const resizeObs = new ResizeObserver(sendResize);
    resizeObs.observe(el);

    term.focus();

    const cleanup = () => {
      resizeObs.disconnect();
      if (ws.readyState <= WebSocket.OPEN) ws.close();
      wsRef.current = null;
      term.dispose();
    };

    cleanupRef.current = cleanup;
  }, []);

  // Initial connect
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [connect]);

  // Warn before leaving with an active session
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleDisconnect = () => {
    setMessage("Disconnected by user");
    setStatus("disconnected");
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, "User disconnect");
    }
    wsRef.current = null;
  };

  const handleNewSession = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    connect();
  };

  return (
    <div className="relative flex h-full flex-col">
      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-zinc-800/40 bg-zinc-950 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              status === "connected" &&
                "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]",
              status === "connecting" && "bg-amber-500 animate-pulse",
              (status === "disconnected" || status === "error") && "bg-zinc-700",
            )}
          />
          <span className="font-mono text-[11px] text-zinc-500">
            {status === "connected"
              ? "live shell · /home/luqman/Storage"
              : status === "connecting"
                ? "connecting…"
                : status === "error"
                  ? "connection failed"
                  : "disconnected"}
          </span>
        </div>

        {status === "connected" && (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-zinc-600 transition-colors hover:bg-zinc-800/60 hover:text-zinc-400"
          >
            <Unplug className="h-3 w-3" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        )}
      </div>

      {/* ── Terminal container ───────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 [&_.xterm]:h-full [&_.xterm-viewport]:!overflow-hidden"
        style={{ minHeight: 0 }}
      />

      {/* ── Overlay for disconnected / error ────────────────────────────── */}
      {(status === "disconnected" || status === "error") && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#08090d]/90 px-6 text-center backdrop-blur-sm">
          <p
            className={cn(
              "max-w-sm text-[13px] leading-relaxed",
              status === "error" ? "text-red-400" : "text-zinc-500",
            )}
          >
            {message || "Session ended"}
          </p>
          <button
            onClick={handleNewSession}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-5 py-2 text-[12px] font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
          >
            New Session
          </button>
        </div>
      )}
    </div>
  );
}
