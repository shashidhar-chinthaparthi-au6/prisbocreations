"use client";

import Link from "next/link";
import { useState } from "react";
import { formatInrFromPaise } from "@/lib/format";
import { qualifiesForFreeShipping } from "@/lib/free-shipping";
import { useCart } from "@/components/cart/CartProvider";
import { useCheckoutStore } from "@/lib/store/checkout-store";

export function CartSummary() {
  const { subtotalPaise } = useCart();
  const {
    couponCode,
    couponDiscountPaise,
    couponValid,
    applyCoupon,
    removeCoupon,
  } = useCheckoutStore();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const freeShip = qualifiesForFreeShipping(subtotalPaise);
  const discount = couponValid ? couponDiscountPaise : 0;
  const total = Math.max(0, subtotalPaise - discount);

  async function apply() {
    const code = input.trim() || couponCode;
    if (!code) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotalPaise }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        data?: { valid?: boolean; discountPaise?: number; message?: string };
      };
      if (!r.ok || !j.ok || !j.data?.valid) {
        setErr(j.data?.message ?? "Invalid or expired coupon code");
        return;
      }
      applyCoupon(code.toUpperCase(), j.data.discountPaise ?? 0);
      setInput(code.toUpperCase());
    } catch {
      setErr("Could not apply coupon");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-fit rounded-2xl border border-[#E8E0D6] bg-white p-6 shadow-sm">
      <p className="font-display text-lg text-[#3D3835]">Order summary</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between text-[#6B6560]">
          <dt>Items</dt>
          <dd>{formatInrFromPaise(subtotalPaise)}</dd>
        </div>
        <div className="flex justify-between text-[#6B6560]">
          <dt>Delivery</dt>
          <dd>{freeShip ? "Free — order qualifies" : "At checkout"}</dd>
        </div>
        {couponValid ? (
          <div className="flex items-start justify-between gap-2 text-emerald-800">
            <dt className="max-w-[70%]">
              Coupon ({couponCode})
              <button type="button" className="ml-1 text-rose-700 hover:underline" onClick={() => removeCoupon()}>
                ×
              </button>
            </dt>
            <dd>−{formatInrFromPaise(discount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-[#E8E0D6] pt-2 font-display text-xl text-[#3D3835]">
          <dt>Total</dt>
          <dd>{formatInrFromPaise(total)}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6B6560]">Coupon code</p>
        <div className="flex gap-2">
          <input
            value={couponCode || input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="PRISMO10"
            className="min-w-0 flex-1 rounded-lg border border-[#E8E0D6] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void apply()}
            className="shrink-0 rounded-lg bg-[#3D3835] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a2624] disabled:opacity-60"
          >
            Apply
          </button>
        </div>
        {err ? <p className="text-xs text-rose-600">{err}</p> : null}
      </div>

      <Link
        href="/checkout"
        className="mt-6 flex w-full items-center justify-center rounded-full bg-[#C47A2B] py-3 text-sm font-semibold text-white hover:bg-[#b06d26]"
      >
        Proceed to checkout →
      </Link>
      <p className="mt-4 flex items-center justify-center gap-1 text-center text-xs text-[#6B6560]">
        <span aria-hidden>🔒</span> Secure checkout · UPI · Cards · COD
      </p>
    </div>
  );
}
