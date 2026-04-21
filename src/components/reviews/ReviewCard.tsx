"use client";

import { StarRatingRow } from "@/components/product/StarRating";
import { HelpfulButtons } from "@/components/reviews/HelpfulButtons";
import { AdminReplyBlock } from "@/components/reviews/AdminReplyBlock";
import { ReviewPhotos } from "@/components/reviews/ReviewPhotos";

export type ReviewCardData = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  photos: string[];
  variantName: string | null;
  isVerified: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  adminReply: string | null;
  createdAt: string;
  reviewer: { name: string; initials: string };
  viewerVote: boolean | null;
};

export function ReviewCard({ r }: { r: ReviewCardData }) {
  const d = new Date(r.createdAt);
  const dateStr = Number.isFinite(d.getTime())
    ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <article className="rounded-xl border border-[var(--brand-border)] bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
          style={{ background: "var(--aml)", color: "var(--am)" }}
        >
          {r.reviewer.initials.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold text-[var(--brand-ink)]">{r.reviewer.name}</span>
            <time className="text-xs text-[var(--brand-muted)] tabular-nums">{dateStr}</time>
          </div>
          <div className="mt-1">
            <StarRatingRow rating={r.rating} reviewCount={1} showReviewCount={false} />
          </div>
          {(r.variantName || r.isVerified) && (
            <p className="mt-1 text-xs text-[var(--brand-muted)]">
              {r.variantName ? <span>{r.variantName} · </span> : null}
              {r.isVerified ? (
                <span
                  className="inline-block rounded-full px-2 py-0.5 font-medium"
                  style={{ fontSize: 11, color: "var(--ok)", background: "#ECFDF5" }}
                >
                  Verified purchase ✓
                </span>
              ) : null}
            </p>
          )}
        </div>
      </div>

      {r.title ? (
        <h3 className="mt-3 font-medium text-[var(--brand-ink)]">&ldquo;{r.title}&rdquo;</h3>
      ) : null}
      <p className="mt-2 text-sm leading-relaxed text-[var(--brand-muted)]">{r.body}</p>
      <ReviewPhotos urls={r.photos} />
      <HelpfulButtons
        reviewId={r.id}
        helpfulCount={r.helpfulCount}
        notHelpfulCount={r.notHelpfulCount}
        initialVote={r.viewerVote}
      />
      {r.adminReply?.trim() ? <AdminReplyBlock text={r.adminReply.trim()} /> : null}
    </article>
  );
}
