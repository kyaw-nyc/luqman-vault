"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  Info,
} from "lucide-react";
import type { FileItem } from "@/types/files";
import { formatBytes, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Props {
  images: FileItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onInfo?: (file: FileItem) => void;
}

export function Lightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
  onInfo,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const file = images[currentIndex];
  if (!file) return null;

  const prev = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
      setZoom(1);
    }
  };
  const next = () => {
    if (currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
      setZoom(1);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "i") setShowInfo((s) => !s);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) {
      if (dx > 0) prev();
      else next();
    }
    touchStartX.current = null;
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-sm">
      {/* Top bar */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between px-4 py-2 transition-opacity duration-200 sm:py-3",
          showInfo ? "opacity-100" : "opacity-0 hover:opacity-100",
        )}
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[13px] text-zinc-300">
            {file.name}
          </p>
          <p className="font-mono text-[11px] text-zinc-600">
            {formatBytes(file.size)} · {formatDate(file.modifiedAt)} ·{" "}
            {currentIndex + 1} / {images.length}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {onInfo && (
            <button
              onClick={() => onInfo(file)}
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
              title="Details"
            >
              <Info className="h-4 w-4" />
            </button>
          )}
          <a
            href={`/api/download?path=${encodeURIComponent(file.path)}`}
            download={file.name}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-auto"
        onClick={() => setShowInfo((s) => !s)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Nav arrows (desktop) */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-2 z-10 hidden rounded-full bg-black/50 p-2 text-zinc-400 transition-colors hover:bg-black/70 hover:text-white sm:block"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {currentIndex < images.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-2 z-10 hidden rounded-full bg-black/50 p-2 text-zinc-400 transition-colors hover:bg-black/70 hover:text-white sm:block"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={file.path}
          src={`/api/download?path=${encodeURIComponent(file.path)}&inline=1`}
          alt={file.name}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Bottom indicator dots (mobile) */}
      {images.length > 1 && images.length <= 20 && (
        <div
          className={cn(
            "flex shrink-0 justify-center gap-1.5 py-2 sm:hidden transition-opacity duration-200",
            showInfo ? "opacity-100" : "opacity-0",
          )}
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                onNavigate(i);
                setZoom(1);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === currentIndex
                  ? "w-4 bg-white"
                  : "w-1.5 bg-zinc-700",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
