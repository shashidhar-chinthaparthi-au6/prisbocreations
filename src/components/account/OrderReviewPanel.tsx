"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WriteReviewModal } from "@/components/reviews/WriteReviewModal";

export type OrderReviewLine = {
  productId: string;
  slug: string;
  name: string;
  imageUrl?: string;
  reviewed: boolean;
};

export function OrderReviewPanel({
  orderId,
  orderDateLabel,
  lines,
}: {
  orderId: string;
  orderDateLabel: string;
  lines: OrderReviewLine[];
}) {
  const router = useRouter();
  const [openFor, setOpenFor] = useState<OrderReviewLine | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#review") {
      window.requestAnimationFrame(() => {
        document.getElementById("review")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  if (!lines.length) return null;

  const pending = lines.filter((l) => !l.reviewed);
  if (pending.length === 0) {
    return (
      <section id="review" className="rounded-2xl border border-[var(--brand-border)] bg-[#faf8f5] p-5">
        <h2 className="font-display text-lg text-[var(--brand-ink)]">Reviews</h2>
        <p className="mt-1 text-sm text-[var(--ok,#2d6a4f)]">Thanks — you&apos;ve reviewed all items in this order.</p>
      </section>
    );
  }

  return (
    <>
      <section id="review" className="rounded-2xl border border-[var(--brand-border)] bg-[#faf8f5] p-5">
        <h2 className="font-display text-lg text-[var(--brand-ink)]">How was your order?</h2>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Tap the stars to rate a product. Reviews are moderated before they appear on the site.
        </p>
        <ul className="mt-4 space-y-4">
          {lines.map((line, idx) => (
            <li key={`${line.productId}-${idx}`} className="flex flex-wrap items-center gap-3">
              <Link href={`/products/${line.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--brand-sand,#F5F0E8)]">
                  {line.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <span className="min-w-0 truncate text-sm font-medium text-[var(--brand-ink)]">{line.name}</span>
              </Link>
              {line.reviewed ? (
                <span className="text-sm font-medium text-[var(--ok,#2d6a4f)]">Reviewed ✓</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenFor(line)}
                  className="rounded-full border border-[var(--brand-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--brand-amber)] hover:border-[var(--brand-amber)]"
                >
                  ☆☆☆☆☆ Rate
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setOpenFor(pending[0] ?? null)}
          className="mt-5 text-sm font-semibold text-[var(--brand-amber)] hover:underline"
        >
          Write reviews →
        </button>
      </section>

      {openFor ? (
        <WriteReviewModal
          key={openFor.productId}
          open={Boolean(openFor)}
          onClose={() => setOpenFor(null)}
          productId={openFor.productId}
          productName={openFor.name}
          orderId={orderId}
          orderDateLabel={orderDateLabel}
          guestMode={false}
          onSuccess={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
