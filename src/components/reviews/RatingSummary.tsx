"use client";

import { useEffect, useState } from "react";
import { StarRatingRow } from "@/components/product/StarRating";

export function RatingSummary({
  avgRating,
  totalReviews,
  breakdown,
  writeControl,
}: {
  avgRating: number;
  totalReviews: number;
  breakdown: { star: number; count: number }[];
  writeControl: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 50);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <span className="font-display text-[48px] font-bold leading-none tabular-nums text-[var(--brand-ink)]">
          {totalReviews > 0 ? avgRating.toFixed(1) : "—"}
        </span>
        <span className="text-sm text-[var(--brand-muted)]">out of 5</span>
        <StarRatingRow
          rating={totalReviews > 0 ? avgRating : 0}
          reviewCount={1}
          showReviewCount={false}
          className="text-sm"
        />
        <p className="text-sm text-[var(--brand-muted)]">{totalReviews} reviews</p>
      </div>

      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const row = breakdown.find((b) => b.star === star) ?? { star, count: 0 };
          const pct = totalReviews > 0 ? (row.count / totalReviews) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-8 tabular-nums text-[var(--brand-muted)]">{star}★</span>
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full"
                style={{ background: "#E8E0D6" }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-[600ms] ease-out"
                  style={{
                    width: mounted ? `${pct}%` : "0%",
                    background: "var(--am)",
                  }}
                />
              </div>
              <span className="w-8 text-right tabular-nums text-[var(--brand-muted)]">{row.count}</span>
            </div>
          );
        })}
      </div>

      <div>{writeControl}</div>
    </div>
  );
}
