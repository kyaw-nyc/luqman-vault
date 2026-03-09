"use client";

import { useState, useEffect } from "react";
import { X, Download, FileX, Loader2 } from "lucide-react";
import type { FileItem } from "@/types/files";
import { formatBytes, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// Extensions that can be previewed as text / code
const IMAGE_EXTS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg",
]);
const TEXT_EXTS = new Set([
  "txt", "json", "yaml", "yml", "ts", "tsx", "js", "jsx", "py", "sh",
  "bash", "zsh", "fish", "csv", "xml", "html", "htm", "css", "scss",
  "toml", "ini", "conf", "env", "gitignore", "lock", "rb", "go", "rs",
  "c", "cpp", "h", "java", "kt", "swift", "sql", "log", "diff", "patch",
]);

type PreviewType = "image" | "pdf" | "markdown" | "text" | "unsupported";

function getPreviewType(ext: string | null): PreviewType {
  if (!ext) return "unsupported";
  if (ext === "pdf") return "pdf";
  if (ext === "md") return "markdown";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (TEXT_EXTS.has(ext)) return "text";
  return "unsupported";
}

interface TextData {
  content: string;
  truncated: boolean;
}

export function FilePreview({
  file,
  onClose,
}: {
  file: FileItem | null;
  onClose: () => void;
}) {
  const [textData, setTextData] = useState<TextData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState("");

  const previewType = file ? getPreviewType(file.extension) : null;
  const needsText = previewType === "text" || previewType === "markdown";

  // Fetch text content when a previewable text file is opened
  useEffect(() => {
    if (!file || !needsText) {
      setTextData(null);
      setFetchError(false);
      setRenderedHtml("");
      return;
    }

    setLoading(true);
    setTextData(null);
    setFetchError(false);
    setRenderedHtml("");

    fetch(`/api/preview?path=${encodeURIComponent(file.path)}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json() as Promise<TextData>;
      })
      .then((data) => setTextData(data))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [file?.path, needsText]);

  // Parse markdown once text is fetched
  useEffect(() => {
    if (previewType !== "markdown" || !textData) return;
    (async () => {
      const { marked } = await import("marked");
      const html = await marked.parse(textData.content);
      setRenderedHtml(html);
    })();
  }, [textData, previewType]);

  // Escape closes the drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isOpen = file !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-[500px] flex-col border-l border-zinc-800/60 bg-[#0a0b0f] shadow-2xl transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {file && (
          <>
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-zinc-800/40 px-5 py-4">
              <div className="min-w-0 flex-1 pr-4">
                <p className="truncate text-[14px] font-medium text-zinc-100">
                  {file.name}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-[11px] text-zinc-600">
                    {formatBytes(file.size)}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-700">·</span>
                  <span className="font-mono text-[11px] uppercase text-zinc-600">
                    {file.extension || "file"}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-700">·</span>
                  <span className="font-mono text-[11px] text-zinc-600">
                    {formatDate(file.modifiedAt)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <a
                  href={`/api/download?path=${encodeURIComponent(file.path)}`}
                  download={file.name}
                  className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={onClose}
                  className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {/* Image */}
              {previewType === "image" && (
                <div className="flex h-full min-h-64 items-center justify-center p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/download?path=${encodeURIComponent(file.path)}&inline=1`}
                    alt={file.name}
                    className="max-h-full max-w-full rounded-lg object-contain"
                  />
                </div>
              )}

              {/* PDF */}
              {previewType === "pdf" && (
                <iframe
                  src={`/api/download?path=${encodeURIComponent(file.path)}&inline=1`}
                  className="h-full min-h-[600px] w-full"
                  title={file.name}
                />
              )}

              {/* Text / Code */}
              {previewType === "text" && (
                <>
                  {loading && <PreviewLoader />}
                  {fetchError && <PreviewError />}
                  {textData && (
                    <pre className="min-h-full whitespace-pre-wrap break-words bg-transparent px-5 py-4 font-mono text-[12px] leading-relaxed text-zinc-300">
                      {textData.content}
                      {textData.truncated && (
                        <span className="mt-4 block font-sans text-[11px] text-zinc-700">
                          — file truncated at 512 KB —
                        </span>
                      )}
                    </pre>
                  )}
                </>
              )}

              {/* Markdown */}
              {previewType === "markdown" && (
                <>
                  {loading && <PreviewLoader />}
                  {fetchError && <PreviewError />}
                  {textData && renderedHtml && (
                    <div
                      className="prose-preview px-6 py-5"
                      dangerouslySetInnerHTML={{ __html: renderedHtml }}
                    />
                  )}
                  {textData && !renderedHtml && !loading && (
                    <PreviewLoader />
                  )}
                </>
              )}

              {/* Unsupported */}
              {previewType === "unsupported" && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <FileX className="mb-3 h-9 w-9 text-zinc-800" />
                  <p className="text-[13px] text-zinc-500">No preview available</p>
                  <p className="mt-1 font-mono text-[11px] text-zinc-700">
                    {file.extension?.toUpperCase() || "unknown"} file
                  </p>
                  <a
                    href={`/api/download?path=${encodeURIComponent(file.path)}`}
                    download={file.name}
                    className="mt-5 rounded-md border border-zinc-800/50 bg-zinc-900/40 px-4 py-1.5 text-[12px] text-zinc-400 transition-colors hover:border-zinc-700/60 hover:text-zinc-200"
                  >
                    Download file
                  </a>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function PreviewLoader() {
  return (
    <div className="flex h-32 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
    </div>
  );
}

function PreviewError() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <FileX className="mb-3 h-7 w-7 text-zinc-800" />
      <p className="text-[12px] text-zinc-600">Could not read file</p>
    </div>
  );
}
