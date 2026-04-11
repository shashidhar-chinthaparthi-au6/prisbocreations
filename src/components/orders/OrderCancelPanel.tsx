"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/fetch-client";
import { Spinner } from "@/components/ui/Spinner";

const PRESET_REASONS = [
  "Ordered by mistake",
  "Delivery will be too slow",
  "Found a better price elsewhere",
  "Shipping cost too high",
  "Other (describe below)",
];

export function OrderCancelPanel({
  orderId,
  guestEmail,
  canCancel,
}: {
  orderId: string;
  /** When set, sent with cancel request for guest verification. */
  guestEmail?: string | null;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!canCancel) return null;

  async function submit() {
    if (!preset.trim() && detail.trim().length < 3) {
      setErr("Choose a preset reason or write at least 3 characters.");
      return;
    }
    if (preset === "Other (describe below)" && detail.trim().length < 3) {
      setErr("Please add a short description for “Other”.");
      return;
    }
    const reason = preset
      ? `${preset}${detail.trim() ? ` — ${detail.trim()}` : ""}`.trim()
      : detail.trim();
    if (reason.length < 3) {
      setErr("Cancellation reason is too short.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = { reason };
      if (guestEmail?.trim()) body.guestEmail = guestEmail.trim();
      await apiFetch(`/api/v1/orders/${orderId}/cancel`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.refresh();
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not cancel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
      <h2 className="font-display text-lg text-ink">Cancel order</h2>
      <p className="mt-1 text-sm text-ink-muted">
        You can cancel before the order ships. We will release any reserved shipment where possible.
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-900 hover:bg-rose-50"
        >
          Request cancellation
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-ink-muted">Reason</span>
            <select
              className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
            >
              <option value="">Select…</option>
              {PRESET_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Additional details (optional)</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm"
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={2000}
            />
          </label>
          {err ? (
            <p className="text-sm text-rose" role="alert">
              {err}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
            >
              {busy ? <Spinner size="sm" className="text-white" /> : null}
              Confirm cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setErr(null);
              }}
              className="rounded-full px-4 py-2 text-sm text-ink-muted hover:text-ink"
            >
              Keep order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
