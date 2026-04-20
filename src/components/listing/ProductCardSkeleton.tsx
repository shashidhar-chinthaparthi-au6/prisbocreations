/** Shimmer placeholder for listing grid (6-up). */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[12px] bg-[var(--brand-card)] shadow-[var(--shadow-card)]">
      <div className="skeleton-shimmer aspect-[1.2/1] w-full rounded-t-[9px]" />
      <div className="space-y-2 px-2 py-2">
        <div className="skeleton-shimmer h-2 w-1/3" />
        <div className="skeleton-shimmer h-3 w-full" />
        <div className="skeleton-shimmer h-3 w-2/3" />
        <div className="skeleton-shimmer mt-2 h-8 w-full rounded-[20px]" />
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
