import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ path }: { path: string }) {
  const segments = path.split("/").filter(Boolean);

  return (
    <nav className="min-w-0 overflow-x-auto scrollbar-none">
      <div className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-zinc-900/50 px-3 py-1.5">
        <span className="font-mono text-[12px] text-zinc-600">~</span>
        <ChevronRight className="h-3 w-3 shrink-0 text-zinc-800" />
        <Link
          href="/files"
          className="font-mono text-[12px] text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Storage
        </Link>
        {segments.map((segment, i) => {
          const href = `/files?path=/${segments.slice(0, i + 1).join("/")}`;
          const isLast = i === segments.length - 1;
          return (
            <span key={href} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 shrink-0 text-zinc-800" />
              {isLast ? (
                <span className="max-w-[160px] truncate font-mono text-[12px] text-zinc-300 sm:max-w-none">
                  {segment}
                </span>
              ) : (
                <Link
                  href={href}
                  className="max-w-[120px] truncate font-mono text-[12px] text-zinc-500 transition-colors hover:text-zinc-300 sm:max-w-none"
                >
                  {segment}
                </Link>
              )}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
