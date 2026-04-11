"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/fetch-client";

export function RetryShipmentSyncButton({
  orderId,
  guestEmail,
}: {
  orderId: string;
  /** Guest orders: same email as on the order page URL. Omit when the viewer is logged in as the buyer. */
  guestEmail?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function retry() {
    setErr(null);
    setBusy(true);
    try {
      const body: Record<string, string> = {};
      if (guestEmail?.trim()) body.guestEmail = guestEmail.trim();
      await apiFetch(`/api/v1/orders/${orderId}/sync-shipment`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load shipment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={retry}
        disabled={busy}
        className="rounded-full border border-sand-deep bg-white px-4 py-2 text-sm font-medium text-ink hover:border-accent disabled:opacity-60"
      >
        {busy ? "Contacting courier…" : "Load shipment & AWB now"}
      </button>
      {err ? (
        <p className="mt-2 text-xs text-rose" role="alert">
          {err}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-ink-muted">
        Use this if AWB did not appear after checkout (for example on a slow connection).
      </p>
    </div>
  );
}
