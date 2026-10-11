/** Shimmer placeholder for listing grid (6-up). */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="skeleton-shimmer aspect-[4/5] w-full" />
      <div className="space-y-2 px-0.5 pt-3">
        <div className="skeleton-shimmer h-2 w-1/3" />
        <div className="skeleton-shimmer h-3 w-4/5" />
        <div className="skeleton-shimmer h-3 w-2/3" />
        <div className="mt-3 flex justify-between">
          <div className="skeleton-shimmer h-3 w-12" />
          <div className="skeleton-shimmer h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
