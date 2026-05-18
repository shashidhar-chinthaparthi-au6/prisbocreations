export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-6 h-7 w-40 animate-pulse rounded-lg bg-sand-deep/60" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 sm:gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="animate-pulse space-y-3 rounded-2xl border border-sand-deep bg-white p-3">
            <div className="aspect-square rounded-xl bg-sand-deep/60" />
            <div className="space-y-2 px-1">
              <div className="h-3.5 w-3/4 rounded bg-sand-deep/60" />
              <div className="h-3 w-1/2 rounded bg-sand-deep/40" />
              <div className="h-4 w-1/3 rounded bg-sand-deep/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
