import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ path }: { path: string }) {
  const segments = path.split("/").filter(Boolean);

  return (
    <nav className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-lg bg-zinc-900/50 px-3 py-1.5">
      <span className="font-mono text-[12px] text-zinc-600">~</span>
      <ChevronRight className="h-3 w-3 text-zinc-800" />
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
            <ChevronRight className="h-3 w-3 text-zinc-800" />
            {isLast ? (
              <span className="font-mono text-[12px] text-zinc-300">
                {segment}
              </span>
            ) : (
              <Link
                href={href}
                className="font-mono text-[12px] text-zinc-500 transition-colors hover:text-zinc-300"
              >
                {segment}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
