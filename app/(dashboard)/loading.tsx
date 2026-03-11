export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-5 w-36 rounded bg-zinc-800/60" />
        <div className="mt-2 h-3 w-56 rounded bg-zinc-800/40" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-zinc-800/30 bg-zinc-900/30"
          />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-56 rounded-xl border border-zinc-800/30 bg-zinc-900/30" />
        <div className="h-56 rounded-xl border border-zinc-800/30 bg-zinc-900/30" />
      </div>
    </div>
  );
}
