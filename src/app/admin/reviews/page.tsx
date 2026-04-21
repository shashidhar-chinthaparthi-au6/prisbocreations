"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch-client";
import { useAdminToast } from "@/components/admin/layout/AdminShell";
import { StarRatingRow } from "@/components/product/StarRating";

type Tab = "pending" | "approved" | "rejected";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  photos: string[];
  variantName: string | null;
  isVerified: boolean;
  reviewer: string;
  productName: string;
  productSlug: string;
};

export default function AdminReviewsPage() {
  const toast = useAdminToast();
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ reviews: ReviewRow[]; counts: typeof counts }>(
        `/api/v1/admin/reviews?status=${tab}`,
      );
      setRows(data.reviews);
      setCounts(data.counts);
    } catch (e) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Failed to load" });
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    try {
      await apiFetch(`/api/v1/admin/reviews/${id}/approve`, { method: "POST" });
      toast({ type: "success", message: "Review approved" });
      await load();
    } catch (e) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function confirmReject() {
    if (!rejectId) return;
    try {
      await apiFetch(`/api/v1/admin/reviews/${rejectId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason }),
      });
      toast({ type: "success", message: "Review rejected" });
      setRejectId(null);
      setRejectReason("");
      await load();
    } catch (e) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function postReply() {
    if (!replyId) return;
    try {
      await apiFetch(`/api/v1/admin/reviews/${replyId}/reply`, {
        method: "POST",
        body: JSON.stringify({ text: replyText }),
      });
      toast({ type: "success", message: "Reply posted" });
      setReplyId(null);
      setReplyText("");
      await load();
    } catch (e) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Failed" });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Review moderation</h1>

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        {(
          [
            ["pending", `Pending (${counts.pending})`],
            ["approved", `Approved (${counts.approved})`],
            ["rejected", `Rejected (${counts.rejected})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === k ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}

      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <StarRatingRow rating={r.rating} reviewCount={1} showReviewCount={false} />
                <p className="mt-1 text-sm text-zinc-600">
                  {r.reviewer} ·{" "}
                  {r.isVerified ? (
                    <span className="text-emerald-700">Verified ✓</span>
                  ) : (
                    <span className="text-zinc-400">Not verified</span>
                  )}
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {r.productName}
                  {r.variantName ? ` — ${r.variantName}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/products/${r.productSlug}`}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  View product
                </Link>
                {tab === "pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void approve(r.id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Approve ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectId(r.id)}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      Reject ✗
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setReplyId(r.id);
                    setReplyText("");
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Reply
                </button>
              </div>
            </div>
            {r.title ? <p className="mt-2 font-medium text-zinc-900">&ldquo;{r.title}&rdquo;</p> : null}
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{r.body}</p>
            {r.photos?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {r.photos.slice(0, 3).map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" className="h-16 w-16 rounded-md object-cover" />
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {!loading && rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No reviews in this tab.</p>
      ) : null}

      {rejectId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="font-semibold text-zinc-900">Reject review</h2>
            <p className="mt-1 text-sm text-zinc-500">Internal note (optional)</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmReject()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white"
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {replyId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="font-semibold text-zinc-900">Store reply</h2>
            <textarea
              value={replyText}
              maxLength={300}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              placeholder="Thank the customer…"
              className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-right text-xs text-zinc-400">{replyText.length}/300</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplyId(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void postReply()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                Post reply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
