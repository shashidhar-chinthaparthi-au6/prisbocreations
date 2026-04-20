"use client";

function StarPath({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-[9px] w-[9px] shrink-0" aria-hidden>
      <path
        fill={filled ? "var(--am)" : "none"}
        stroke="var(--am)"
        strokeWidth="1.2"
        d="M10 2.5l2.35 4.76 5.26.76-3.8 3.7.9 5.24L10 14.9l-4.71 2.48.9-5.24-3.8-3.7 5.26-.76L10 2.5z"
      />
    </svg>
  );
}

/** `rating` 0–5, rounded to nearest 0.5 for display. */
export function StarRatingRow({
  rating,
  reviewCount,
  className = "",
  showReviewCount = true,
}: {
  rating: number;
  reviewCount: number;
  className?: string;
  /** When false, only stars (e.g. single review lines). */
  showReviewCount?: boolean;
}) {
  if (showReviewCount && reviewCount < 1) return null;
  const r = Math.round(rating * 2) / 2;
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < full) return <StarPath key={i} filled />;
          if (i === full && half) {
            return (
              <span key={i} className="relative inline-flex h-[9px] w-[9px] shrink-0">
                <StarPath filled={false} />
                <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                  <StarPath filled />
                </span>
              </span>
            );
          }
          return <StarPath key={i} filled={false} />;
        })}
      </span>
      {showReviewCount ? (
        <span className="text-[9px] text-[var(--muted)] tabular-nums">({reviewCount} reviews)</span>
      ) : null}
    </div>
  );
}
