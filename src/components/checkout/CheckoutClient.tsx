"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { apiFetch } from "@/lib/api/fetch-client";
import { formatInrFromPaise } from "@/lib/format";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type PayMode = "razorpay" | "cod";

export function CheckoutClient({
  isAuthenticated,
  defaultEmail = "",
}: {
  isAuthenticated: boolean;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const { lines, subtotalPaise, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<PayMode>("razorpay");
  const [guestEmail, setGuestEmail] = useState(defaultEmail);
  const [ship, setShip] = useState({
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  function thankYouPath(orderId: string, opts: { paid?: boolean; cod?: boolean }) {
    const q = new URLSearchParams();
    if (opts.paid) q.set("paid", "1");
    if (opts.cod) q.set("cod", "1");
    if (!isAuthenticated) q.set("email", guestEmail.trim());
    const qs = q.toString();
    return qs ? `/orders/${orderId}?${qs}` : `/orders/${orderId}`;
  }

  async function submitCod() {
    setErr(null);
    if (!lines.length) {
      setErr("Cart is empty");
      return;
    }
    if (!isAuthenticated) {
      const em = guestEmail.trim();
      if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        setErr("Enter a valid email for guest checkout");
        return;
      }
    }
    setBusy(true);
    try {
      const orderBody: Record<string, unknown> = {
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          ...(l.optionKey ? { optionKey: l.optionKey } : {}),
        })),
        shipping: ship,
        paymentMethod: "cod",
      };
      if (!isAuthenticated) {
        orderBody.guestEmail = guestEmail.trim();
      }
      const order = await apiFetch<{ _id: string }>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify(orderBody),
      });
      clear();
      router.push(thankYouPath(order._id, { cod: true }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  async function payOnline() {
    setErr(null);
    if (!lines.length) {
      setErr("Cart is empty");
      return;
    }
    if (!isAuthenticated) {
      const em = guestEmail.trim();
      if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        setErr("Enter a valid email for guest checkout");
        return;
      }
    }
    setBusy(true);
    try {
      const orderBody: Record<string, unknown> = {
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          ...(l.optionKey ? { optionKey: l.optionKey } : {}),
        })),
        shipping: ship,
        paymentMethod: "online",
      };
      if (!isAuthenticated) {
        orderBody.guestEmail = guestEmail.trim();
      }
      const order = await apiFetch<{
        _id: string;
        totalPaise: number;
        status: string;
      }>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify(orderBody),
      });

      const payBody: Record<string, unknown> = { orderId: order._id };
      if (!isAuthenticated) {
        payBody.guestEmail = guestEmail.trim();
      }
      const payInit = await apiFetch<{
        razorpayOrderId: string;
        keyId: string;
        amountPaise: number;
      }>("/api/v1/payments/razorpay/create-order", {
        method: "POST",
        body: JSON.stringify(payBody),
      });

      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) throw new Error("Could not load Razorpay");

      const rz = new window.Razorpay({
        key: payInit.keyId,
        order_id: payInit.razorpayOrderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setBusy(true);
          try {
            const verifyBody: Record<string, unknown> = {
              appOrderId: order._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };
            if (!isAuthenticated) {
              verifyBody.guestEmail = guestEmail.trim();
            }
            await apiFetch("/api/v1/payments/razorpay/verify", {
              method: "POST",
              body: JSON.stringify(verifyBody),
            });
            clear();
            router.push(thankYouPath(order._id, { paid: true }));
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Payment verification failed");
          } finally {
            setBusy(false);
          }
        },
        theme: { color: "#b45309" },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });
      rz.open();
      setBusy(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Checkout failed");
      setBusy(false);
    }
  }

  async function submit() {
    if (payMode === "cod") await submitCod();
    else await payOnline();
  }

  if (!lines.length) {
    return (
      <p className="text-ink-muted">
        Your cart is empty.{" "}
        <a href="/categories" className="text-accent underline">
          Browse products
        </a>
      </p>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-sand-deep bg-white p-6">
        <h2 className="font-display text-xl text-ink">Shipping</h2>
        {!isAuthenticated ? (
          <label className="block text-sm">
            <span className="text-ink-muted">Email (for order confirmation)</span>
            <input
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
        ) : null}
        {(
          [
            ["fullName", "Full name"],
            ["phone", "Phone"],
            ["line1", "Address line 1"],
            ["line2", "Address line 2 (optional)"],
            ["city", "City"],
            ["state", "State"],
            ["postalCode", "Postal code"],
            ["country", "Country"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="block text-sm">
            <span className="text-ink-muted">{label}</span>
            <input
              className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
              value={ship[k]}
              onChange={(e) => setShip((s) => ({ ...s, [k]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <div className="space-y-4 rounded-2xl border border-sand-deep bg-white p-6">
        <h2 className="font-display text-xl text-ink">Summary</h2>
        <p className="text-sm text-ink-muted">
          {lines.reduce((n, l) => n + l.quantity, 0)} items
        </p>
        <p className="font-display text-2xl text-ink">{formatInrFromPaise(subtotalPaise)}</p>

        <fieldset className="space-y-3 border-0 p-0">
          <legend className="text-sm font-medium text-ink">Payment</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand-deep p-3 has-[:checked]:border-accent">
            <input
              type="radio"
              name="pay"
              className="mt-1"
              checked={payMode === "razorpay"}
              onChange={() => setPayMode("razorpay")}
            />
            <span>
              <span className="font-medium text-ink">Pay online</span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                Card, UPI, netbanking via Razorpay
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand-deep p-3 has-[:checked]:border-accent">
            <input
              type="radio"
              name="pay"
              className="mt-1"
              checked={payMode === "cod"}
              onChange={() => setPayMode("cod")}
            />
            <span>
              <span className="font-medium text-ink">Cash on delivery</span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                Pay in cash when your order arrives. No online payment now.
              </span>
            </span>
          </label>
        </fieldset>

        {err ? <p className="text-sm text-rose">{err}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-50"
        >
          {busy
            ? "Processing…"
            : payMode === "cod"
              ? "Place order (COD)"
              : "Pay with Razorpay"}
        </button>
        {payMode === "razorpay" ? (
          <p className="text-xs text-ink-muted">
            You will be redirected to Razorpay secure checkout. Use test cards from Razorpay docs in
            test mode.
          </p>
        ) : (
          <p className="text-xs text-ink-muted">
            We&apos;ll confirm your order and contact you if we need any details. Please keep exact
            change handy if possible.
          </p>
        )}
      </div>
    </div>
  );
}
