"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { StarRatingRow } from "@/components/product/StarRating";

type ReviewRow = {
  id: string;
  rating: number;
  body: string;
  guestName: string;
  isVerified?: boolean;
  createdAt?: string;
};

export function ProductReviewsSection({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const { status } = useSession();
  const [data, setData] = useState<{
    reviews: ReviewRow[];
    average: number;
    count: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`/api/reviews/${productId}`);
        const j = (await r.json()) as {
          data?: { reviews: ReviewRow[]; average: number; count: number };
        };
        if (!cancelled && j.data) setData(j.data);
      } catch {
        if (!cancelled) setData({ reviews: [], average: 0, count: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!data || data.count < 1) return null;

  const loginHref = `/login?redirect=${encodeURIComponent(`/products/${productSlug}`)}`;

  return (
    <section id="reviews" className="mt-14 border-t border-[var(--brand-border)] pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl text-[var(--brand-ink)] sm:text-2xl">Reviews</h2>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">{data.count} verified ratings</p>
        </div>
        {status === "authenticated" ? (
          <p className="text-sm text-[var(--brand-muted)]">Thank you for shopping with us — reviews help others choose.</p>
        ) : (
          <Link href={loginHref} className="text-sm font-medium text-[var(--brand-amber-dark)] hover:underline">
            Sign in to write a review
          </Link>
        )}
      </div>

      <div className="mt-6 flex items-baseline gap-3">
        <span className="font-display text-3xl tabular-nums text-[var(--brand-ink)]">{data.average.toFixed(1)}</span>
        <StarRatingRow rating={data.average} reviewCount={data.count} className="text-sm" />
      </div>

      <ul className="mt-8 space-y-6">
        {data.reviews.slice(0, 5).map((rev) => (
          <li key={rev.id} className="rounded-xl border border-[var(--brand-border)] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--brand-ink)]">{rev.guestName || "Customer"}</p>
              <time className="text-xs text-[var(--brand-muted)] tabular-nums">
                {rev.createdAt
                  ? new Date(rev.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : ""}
              </time>
            </div>
            <div className="mt-2">
              <StarRatingRow rating={rev.rating} reviewCount={1} showReviewCount={false} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--brand-muted)]">&ldquo;{rev.body}&rdquo;</p>
            {rev.isVerified ? (
              <p className="mt-2 text-xs font-medium text-[var(--brand-success)]">Verified purchase</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
