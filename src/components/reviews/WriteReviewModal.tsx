"use client";

import { useEffect, useState } from "react";
import { StarPicker } from "@/components/reviews/StarPicker";
import { GuestVerifyStep } from "@/components/reviews/GuestVerifyStep";

export function WriteReviewModal({
  open,
  onClose,
  productId,
  productName,
  orderId,
  orderDateLabel,
  guestMode,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  orderId?: string | null;
  orderDateLabel?: string | null;
  guestMode: boolean;
  onSuccess?: () => void;
}) {
  const [step, setStep] = useState<"guest" | "form">(guestMode ? "guest" : "form");
  const [guestEmail, setGuestEmail] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(guestMode ? "guest" : "form");
    setGuestEmail(null);
    setRating(0);
    setTitle("");
    setBody("");
    setPhotos([]);
    setMessage(null);
  }, [open, guestMode]);

  if (!open) return null;

  function reset() {
    setStep(guestMode ? "guest" : "form");
    setGuestEmail(null);
    setRating(0);
    setTitle("");
    setBody("");
    setPhotos([]);
    setMessage(null);
  }

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const r = await fetch("/api/uploads/review-photo", {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    });
    const j = (await r.json()) as { ok?: boolean; data?: { url: string }; error?: string };
    if (!j.ok || !j.data?.url) throw new Error(j.error ?? "Upload failed");
    return j.data.url;
  }

  async function onPickPhotos(files: FileList | null) {
    if (!files?.length) return;
    const next = [...photos];
    for (const f of Array.from(files)) {
      if (next.length >= 3) break;
      setUploading(true);
      try {
        const url = await uploadFile(f);
        next.push(url);
      } catch {
        setMessage("Could not upload a photo. Try JPG, PNG, or WebP under 5 MB.");
      } finally {
        setUploading(false);
      }
    }
    setPhotos(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setMessage("Please choose a star rating.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          body: body.trim(),
          photos,
          orderId: orderId ?? undefined,
          ...(guestMode && guestEmail ? { guestEmail } : {}),
        }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        data?: { message?: string };
        error?: string;
      };
      if (!j.ok) {
        setMessage(j.error ?? "Could not submit");
        return;
      }
      setMessage(j.data?.message ?? "Thanks!");
      onSuccess?.();
      window.setTimeout(() => {
        onClose();
        reset();
      }, 1200);
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--brand-card)] p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-xl text-[var(--brand-ink)]">Write a review</h2>
            <p className="mt-1 text-sm font-medium text-[var(--brand-ink)]">{productName}</p>
            {orderDateLabel ? (
              <p className="text-xs text-[var(--brand-muted)]">Your order from {orderDateLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-full px-2 py-1 text-lg leading-none text-[var(--brand-muted)] hover:bg-black/5"
            onClick={() => {
              onClose();
              reset();
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-6">
          {guestMode && step === "guest" ? (
            <GuestVerifyStep
              productId={productId}
              onVerified={(em) => {
                setGuestEmail(em);
                setStep("form");
              }}
            />
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <p className="text-sm font-medium text-[var(--brand-ink)]">Your rating *</p>
                <div className="mt-2">
                  <StarPicker rating={rating} onChange={setRating} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--brand-ink)]">
                  Review title (optional)
                  <input
                    value={title}
                    maxLength={100}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--brand-border)] px-3 py-2 text-sm"
                  />
                </label>
                <p className="mt-0.5 text-right text-[10px] text-[var(--brand-muted)]">
                  {title.length}/100
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--brand-ink)]">
                  Your review *
                  <textarea
                    required
                    minLength={20}
                    maxLength={500}
                    rows={5}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Share your experience — what did you love? Would you recommend it?"
                    className="mt-1 w-full rounded-lg border border-[var(--brand-border)] px-3 py-2 text-sm"
                  />
                </label>
                <p className="mt-0.5 text-right text-[10px] text-[var(--brand-muted)]">
                  {body.length}/500 (min 20)
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--brand-ink)]">Add photos (optional)</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-full border border-dashed border-[var(--brand-border)] px-3 py-2 text-xs font-medium hover:border-[var(--am)]">
                    + Add photos
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      multiple
                      disabled={uploading || photos.length >= 3}
                      onChange={(e) => void onPickPhotos(e.target.files)}
                    />
                  </label>
                  {photos.map((u) => (
                    <span key={u} className="relative inline-block h-14 w-14">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-full w-full rounded-md object-cover" />
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                        onClick={() => setPhotos((p) => p.filter((x) => x !== u))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-[var(--brand-muted)]">Up to 3 images, 5 MB each.</p>
              </div>
              {message ? (
                <p className={`text-sm ${message.includes("Thanks") ? "text-[var(--ok)]" : "text-red-700"}`}>
                  {message}
                </p>
              ) : null}
              <div className="border-t border-[var(--brand-border)] pt-4">
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="btn-primary min-h-11 w-full justify-center sm:w-auto"
                >
                  {submitting ? "Submitting…" : "Submit review"}
                </button>
                <p className="mt-2 text-[11px] text-[var(--brand-muted)]">
                  Reviews are checked before publishing (usually within 1–2 days).
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
