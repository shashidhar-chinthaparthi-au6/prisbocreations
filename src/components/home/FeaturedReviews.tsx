"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StarRatingRow } from "@/components/product/StarRating";

type Row = {
  id: string;
  rating: number;
  body: string;
  reviewerName: string;
  productName: string;
  productSlug: string;
};

export function FeaturedReviews() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/reviews/featured", { credentials: "same-origin" });
        const j = (await r.json()) as { ok?: boolean; data?: { reviews: Row[] } };
        if (!cancelled && j.ok && j.data?.reviews) setRows(j.data.reviews);
        else if (!cancelled) setRows([]);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (rows === null) {
    return (
      <section className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-8 text-center text-sm text-[var(--brand-muted)]">
        Loading reviews…
      </section>
    );
  }

  if (rows.length === 0) return null;

  return (
    <section className="space-y-6">
      <h2 className="text-center font-display text-2xl text-[var(--brand-ink)] md:text-3xl">
        What our customers say
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {rows.map((r) => (
          <article
            key={r.id}
            className="flex flex-col rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-5 shadow-[var(--shadow-card)]"
          >
            <StarRatingRow rating={r.rating} reviewCount={1} showReviewCount={false} className="text-sm" />
            <p className="mt-4 flex-1 text-sm leading-relaxed text-[var(--brand-muted)]">
              &ldquo;{r.body.length > 220 ? `${r.body.slice(0, 220)}…` : r.body}&rdquo;
            </p>
            <p className="mt-4 text-sm font-medium text-[var(--brand-ink)]">
              — {r.reviewerName}{" "}
              <span className="font-normal text-[var(--ok,#2d6a4f)]">Verified ✓</span>
            </p>
            <Link
              href={`/products/${r.productSlug}`}
              className="mt-2 text-xs font-medium text-[var(--brand-amber)] hover:underline"
            >
              {r.productName}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
