"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { RatingSummary } from "@/components/reviews/RatingSummary";
import { ReviewCard, type ReviewCardData } from "@/components/reviews/ReviewCard";
import { WriteReviewModal } from "@/components/reviews/WriteReviewModal";

type ApiPayload = {
  reviews: ReviewCardData[];
  total: number;
  avgRating: number;
  breakdown: { star: number; count: number }[];
  totalApproved?: number;
};

function parseHash(): { sort: string; stars: string; photos: boolean } {
  if (typeof window === "undefined") {
    return { sort: "recent", stars: "all", photos: false };
  }
  const h = window.location.hash.replace(/^#/, "");
  if (!h.startsWith("reviews")) return { sort: "recent", stars: "all", photos: false };
  const q = h.includes("?") ? h.split("?")[1] ?? "" : "";
  const sp = new URLSearchParams(q);
  return {
    sort: sp.get("sort") ?? "recent",
    stars: sp.get("stars") ?? "all",
    photos: sp.get("photos") === "true",
  };
}

function writeHash(sort: string, stars: string, photos: boolean) {
  const sp = new URLSearchParams();
  sp.set("sort", sort);
  sp.set("stars", stars);
  if (photos) sp.set("photos", "true");
  const path = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
  window.history.replaceState(null, "", `${path}#reviews?${sp.toString()}`);
}

export function ReviewSection({
  productId,
  productSlug,
  productName,
}: {
  productId: string;
  productSlug: string;
  productName: string;
}) {
  const { status } = useSession();
  const [data, setData] = useState<ApiPayload | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("recent");
  const [stars, setStars] = useState("all");
  const [photosOnly, setPhotosOnly] = useState(false);
  const [loaded, setLoaded] = useState<ReviewCardData[]>([]);
  const [writeOpen, setWriteOpen] = useState(false);
  const [elig, setElig] = useState<{
    canReview: boolean;
    isVerified: boolean;
    existingReview: string | null;
    eligibleOrderId: string | null;
  } | null>(null);

  const fetchList = useCallback(
    async (p: number, reset: boolean, s: string, st: string, ph: boolean) => {
      const sp = new URLSearchParams();
      sp.set("sort", s);
      if (st !== "all") sp.set("stars", st);
      if (ph) sp.set("photos", "true");
      sp.set("page", String(p));
      sp.set("limit", "5");
      const r = await fetch(`/api/reviews/${productId}?${sp.toString()}`, { credentials: "same-origin" });
      const j = (await r.json()) as { ok?: boolean; data?: ApiPayload };
      if (!j.ok || !j.data) return;
      setData(j.data);
      setLoaded((prev) => (reset ? j.data!.reviews : [...prev, ...j.data!.reviews]));
    },
    [productId],
  );

  useEffect(() => {
    const { sort: hs, stars: hst, photos: hp } = parseHash();
    setSort(hs);
    setStars(hst);
    setPhotosOnly(hp);
    setPage(1);
    void fetchList(1, true, hs, hst, hp);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load for product only
  }, [productId]);

  useEffect(() => {
    void (async () => {
      const r = await fetch(`/api/reviews/eligibility?productId=${encodeURIComponent(productId)}`, {
        credentials: "same-origin",
      });
      const j = (await r.json()) as {
        ok?: boolean;
        data?: {
          canReview: boolean;
          isVerified: boolean;
          existingReview: string | null;
          eligibleOrderId: string | null;
        };
      };
      if (j.ok && j.data) setElig(j.data);
    })();
  }, [productId]);

  const totalReviews = data?.totalApproved ?? data?.total ?? 0;
  const hasMore = data ? loaded.length < data.total : false;

  const loginHref = `/login?redirect=${encodeURIComponent(`/products/${productSlug}`)}`;

  const writeControl =
    elig == null ? (
      <p className="text-sm text-[var(--brand-muted)]">Checking eligibility…</p>
    ) : elig.existingReview ? (
      <p className="text-sm text-[var(--brand-muted)]">You reviewed this product</p>
    ) : status === "unauthenticated" ? (
      <div className="space-y-2">
        <p className="text-sm text-[var(--brand-muted)]">
          <Link href={loginHref} className="font-medium text-[var(--brand-amber)] hover:underline">
            Sign in
          </Link>{" "}
          to write a review, or verify the email you used when ordering.
        </p>
        <button
          type="button"
          className="btn-secondary w-full min-h-10 text-sm sm:w-auto"
          onClick={() => setWriteOpen(true)}
        >
          Write a review ✎
        </button>
      </div>
    ) : elig.canReview ? (
      <button
        type="button"
        className="btn-secondary min-h-10 px-5 text-sm"
        onClick={() => setWriteOpen(true)}
      >
        Write a review ✎
      </button>
    ) : !elig.isVerified ? (
      <p className="text-sm text-[var(--brand-muted)]">Buy this product to leave a review</p>
    ) : (
      <p className="text-sm text-[var(--brand-muted)]">You can&apos;t review this product yet</p>
    );

  return (
    <>
      <section id="reviews" className="mt-14 border-t border-[var(--brand-border)] pt-10">
        <h2 className="font-display text-xl text-[var(--brand-ink)] sm:text-2xl">Customer reviews</h2>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">Ratings from verified buyers (moderated)</p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,35%)_minmax(0,65%)]">
          <RatingSummary
            avgRating={data?.avgRating ?? 0}
            totalReviews={totalReviews}
            breakdown={
              data?.breakdown ??
              [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 }))
            }
            writeControl={writeControl}
          />

          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-medium text-[var(--brand-muted)]">
                Sort
                <select
                  value={sort}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSort(v);
                    setPage(1);
                    writeHash(v, stars, photosOnly);
                    void fetchList(1, true, v, stars, photosOnly);
                  }}
                  className="ml-2 rounded-lg border border-[var(--brand-border)] bg-white px-2 py-1.5 text-sm"
                >
                  <option value="recent">Most recent</option>
                  <option value="helpful">Most helpful</option>
                  <option value="highest">Highest rated</option>
                  <option value="lowest">Lowest rated</option>
                </select>
              </label>
              <label className="text-xs font-medium text-[var(--brand-muted)]">
                Filter
                <select
                  value={stars}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStars(v);
                    setPage(1);
                    writeHash(sort, v, photosOnly);
                    void fetchList(1, true, sort, v, photosOnly);
                  }}
                  className="ml-2 rounded-lg border border-[var(--brand-border)] bg-white px-2 py-1.5 text-sm"
                >
                  <option value="all">All stars</option>
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--brand-ink)]">
                <input
                  type="checkbox"
                  checked={photosOnly}
                  onChange={(e) => {
                    const ph = e.target.checked;
                    setPhotosOnly(ph);
                    setPage(1);
                    writeHash(sort, stars, ph);
                    void fetchList(1, true, sort, stars, ph);
                  }}
                />
                Only reviews with photos
              </label>
            </div>

            {!data ? (
              <p className="text-sm text-[var(--brand-muted)]">Loading reviews…</p>
            ) : loaded.length === 0 ? (
              <p className="text-sm text-[var(--brand-muted)]">No reviews match these filters yet.</p>
            ) : (
              <ul className="space-y-5">
                {loaded.map((rev) => (
                  <li key={rev.id}>
                    <ReviewCard r={rev} />
                  </li>
                ))}
              </ul>
            )}

            {hasMore ? (
              <button
                type="button"
                className="text-sm font-medium text-[var(--brand-amber)] hover:underline"
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  void fetchList(next, false, sort, stars, photosOnly);
                }}
              >
                Load more reviews
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <WriteReviewModal
        open={writeOpen}
        onClose={() => setWriteOpen(false)}
        productId={productId}
        productName={productName}
        orderId={elig?.eligibleOrderId ?? null}
        guestMode={status === "unauthenticated"}
      />
    </>
  );
}
