"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, RefreshCw, ChevronDown, Copy, Check, FileWarning } from "lucide-react";
import { fetchServiceLogs } from "@/lib/api";
import { cn } from "@/lib/utils";

const LINE_OPTIONS = ["50", "100", "200", "boot"] as const;
type LineOption = (typeof LINE_OPTIONS)[number];

interface LogDrawerProps {
  serviceName: string;
  onClose: () => void;
}

export function LogDrawer({ serviceName, onClose }: LogDrawerProps) {
  const [lines, setLines] = useState<LineOption>("100");
  const [log, setLog] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLPreElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchServiceLogs(serviceName, lines);
      setLog(result.log);
      setFetchedAt(result.fetchedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [serviceName, lines]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCopy = async () => {
    if (!log) return;
    try {
      await navigator.clipboard.writeText(log);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may not be available */
    }
  };

  const logLines = log?.split("\n") ?? [];
  const hasContent = logLines.length > 0 && logLines.some((l) => l.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex w-full flex-col border-l border-zinc-800/60 bg-zinc-950 shadow-2xl sm:max-w-2xl">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-zinc-800/40 bg-zinc-950 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="truncate font-mono text-[14px] font-semibold text-zinc-100">
              {serviceName}
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-600">
              {fetchedAt
                ? `fetched ${new Date(fetchedAt).toLocaleTimeString()}`
                : "Loading…"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <select
                value={lines}
                onChange={(e) => setLines(e.target.value as LineOption)}
                className="appearance-none rounded-md border border-zinc-800 bg-zinc-900 py-1.5 pl-3 pr-7 font-mono text-[11px] text-zinc-300 outline-none transition-colors hover:border-zinc-700 focus:border-zinc-600"
              >
                {LINE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "boot" ? "since boot" : `last ${opt}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-600" />
            </div>

            <button
              onClick={handleCopy}
              disabled={!hasContent}
              title="Copy log text"
              className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-30"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={load}
              disabled={loading}
              title="Refresh logs"
              className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-40"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Log output */}
        <pre
          ref={scrollRef}
          className="flex-1 overflow-auto px-4 py-4 font-mono text-[12px] leading-[1.7] text-zinc-400 sm:px-5 sm:py-5"
        >
          {loading && !log && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <RefreshCw className="h-5 w-5 animate-spin text-zinc-700" />
              <span className="text-[12px] text-zinc-700">Fetching logs…</span>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <FileWarning className="h-5 w-5 text-red-500/60" />
              <span className="text-[12px] text-red-400">{error}</span>
              <button
                onClick={load}
                className="mt-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !error && !hasContent && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <FileWarning className="h-5 w-5 text-zinc-800" />
              <span className="text-[12px] text-zinc-700">
                No logs available for this service.
              </span>
            </div>
          )}
          {hasContent &&
            logLines.map((line, i) => (
              <LogLine key={i} line={line} />
            ))}
        </pre>
      </div>
    </div>
  );
}

const SEV_ERROR = /\b(error|fatal|panic|failed|exception)\b/i;
const SEV_WARN = /\b(warn(?:ing)?)\b/i;
const SEV_OK = /\b(started|succeeded|active \(running\))\b/i;

function LogLine({ line }: { line: string }) {
  let color = "text-zinc-500";
  if (SEV_ERROR.test(line)) {
    color = "text-red-400/90";
  } else if (SEV_WARN.test(line)) {
    color = "text-amber-400/80";
  } else if (SEV_OK.test(line)) {
    color = "text-emerald-400/70";
  }

  return (
    <div className={cn("min-h-[1.7em] whitespace-pre-wrap break-all", color)}>
      {line || "\u00A0"}
    </div>
  );
}
