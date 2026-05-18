"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import type { SafeContactOrderRow } from "@/lib/track-contact";
import { STATUS_BADGE, type OrderStatusBadgeKey } from "@/lib/trackingStatus";
import { TrackTurnstile } from "@/components/tracking/TrackTurnstile";
import { formatInrFromPaise } from "@/lib/format";

function badgeForStage(stage: string): OrderStatusBadgeKey {
  const s = stage as OrderStatusBadgeKey;
  if (s in STATUS_BADGE) return s;
  if (stage === "PLACED") return "PENDING";
  if (stage === "CONFIRMED") return "CONFIRMED";
  if (stage === "PACKED") return "PACKED";
  if (stage === "SHIPPED") return "SHIPPED";
  if (stage === "OUT_FOR_DELIVERY") return "OUT_FOR_DELIVERY";
  if (stage === "DELIVERED") return "DELIVERED";
  if (stage === "CANCELLED") return "CANCELLED";
  if (stage === "RTO") return "RTO";
  return "CONFIRMED";
}

type ApiErr = { ok: false; error?: string; requiresCaptcha?: boolean };

export function TrackByContactPanel({
  onTrackOrder,
  onBackToOrderNumber,
}: {
  onTrackOrder: (orderNumber: string, contact: string) => Promise<void>;
  onBackToOrderNumber: () => void;
}) {
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [orders, setOrders] = useState<SafeContactOrderRow[] | null>(null);
  const [needsCaptcha, setNeedsCaptcha] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);

  const clearTurnstile = useCallback(() => setTurnstileToken(undefined), []);

  async function submit(extraToken?: string) {
    setErr(null);
    const token = extraToken ?? turnstileToken;
    if (needsCaptcha && !token?.trim()) {
      setErr("Please complete the security check.");
      return;
    }
    setBusy(true);
    setOrders(null);
    try {
      const res = await fetch("/api/track/by-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: contact.trim(),
          ...(token?.trim() ? { turnstileToken: token.trim() } : {}),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: { orders: SafeContactOrderRow[] }; requiresCaptcha?: boolean } & ApiErr;
      if (!res.ok || !json.ok) {
        if (json.requiresCaptcha) setNeedsCaptcha(true);
        setErr(json.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      setNeedsCaptcha(false);
      setOrders(json.data?.orders ?? []);
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    void submit();
  }

  return (
    <div className="space-y-6">
      <div className="relative py-2 text-center text-xs font-medium uppercase tracking-wide text-[#6B6560]">
        <span className="bg-[#FDFAF7] px-2 relative z-[1]">Track by phone or email</span>
        <div className="absolute left-0 right-0 top-1/2 z-0 h-px bg-[#E8E4DC]" aria-hidden />
      </div>

      <form onSubmit={onSubmitForm} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A]">
            Email address or phone number <span className="text-red-600">*</span>
          </label>
          <input
            className="mt-1.5 w-full rounded-lg border border-[#D3D1C7] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none ring-[#C47A2B] focus:ring-2"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="you@example.com or 9876543210"
            autoComplete="off"
            required
          />
          <p className="mt-1 text-xs text-[#6B6560]">We&apos;ll show all orders placed with this contact.</p>
        </div>

        {needsCaptcha ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-3">
            <p className="text-xs font-medium text-amber-950">Please complete the security check.</p>
            <div className="mt-2">
              <TrackTurnstile onToken={(t) => setTurnstileToken(t)} onClear={clearTurnstile} />
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center rounded-full bg-[#C47A2B] py-3 text-sm font-semibold text-white transition hover:bg-[#A86424] disabled:opacity-60"
        >
          {busy ? "Searching…" : "Find my orders →"}
        </button>
      </form>

      {err ? (
        <p className="rounded-lg border border-[#FED7AA] bg-white px-3 py-2 text-sm text-[#9A3412]" role="alert">
          {err}
        </p>
      ) : null}

      {orders && orders.length > 0 ? (
        <ul className="space-y-3">
          {orders.map((o) => {
            const badge = STATUS_BADGE[badgeForStage(o.status)];
            const placed = new Date(o.placedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const totalPaise = o.total * 100;
            return (
              <li
                key={o.orderNumber}
                className="flex gap-3 rounded-xl border border-[#E8E4DC] bg-white p-4 shadow-sm"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#F5F0E8]">
                  {o.firstItemImage ? (
                    <Image src={o.firstItemImage} alt="" fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl text-[#D3D1C7]">📦</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold text-[#1A1A1A]">Order #{o.orderNumber}</p>
                  <p className="mt-0.5 text-xs text-[#6B6560]">
                    {placed} · {o.itemCount} items · {formatInrFromPaise(totalPaise)}
                  </p>
                  {o.city ? <p className="mt-0.5 text-xs text-[#6B6560]">{o.city}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      {badge.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => void onTrackOrder(o.orderNumber, contact.trim())}
                      className="text-xs font-semibold text-[#C47A2B] hover:underline"
                    >
                      Track this order →
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={onBackToOrderNumber}
        className="text-sm font-medium text-[#6B6560] underline hover:text-[#C47A2B]"
      >
        I have my order number
      </button>
    </div>
  );
}
