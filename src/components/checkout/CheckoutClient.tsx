"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { apiFetch } from "@/lib/api/fetch-client";
import { formatInrFromPaise } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";

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

type ShipCourierRow = {
  courierId: number;
  courierName: string;
  freightChargeRupees: number;
  codChargesRupees: number;
  totalChargeRupees: number;
  estimatedDeliveryDays?: string;
  rating?: number;
};

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
  const [shipQuotes, setShipQuotes] = useState<ShipCourierRow[]>([]);
  const [shipQuoteLoading, setShipQuoteLoading] = useState(false);
  const [shipQuoteErr, setShipQuoteErr] = useState<string | null>(null);
  const [selectedShiprocketCourierId, setSelectedShiprocketCourierId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const pin = ship.postalCode.replace(/\D/g, "");
    if (pin.length !== 6) {
      setShipQuotes([]);
      setSelectedShiprocketCourierId(null);
      setShipQuoteErr(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setShipQuoteLoading(true);
      setShipQuoteErr(null);
      try {
        const res = await fetch("/api/v1/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryPostalCode: pin,
            cod: payMode === "cod",
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          data?: { couriers?: ShipCourierRow[] };
        };
        if (res.status === 503) {
          if (!cancelled) setShipQuotes([]);
          return;
        }
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? "Could not load delivery quotes");
        }
        const rows = json.data?.couriers ?? [];
        if (!cancelled) {
          setShipQuotes(rows);
          setSelectedShiprocketCourierId(rows[0]?.courierId ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setShipQuotes([]);
          setShipQuoteErr(e instanceof Error ? e.message : "Quote failed");
        }
      } finally {
        if (!cancelled) setShipQuoteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ship.postalCode, payMode]);

  const deliveryPaise = useMemo(() => {
    const row = shipQuotes.find((c) => c.courierId === selectedShiprocketCourierId);
    return row ? Math.round(row.totalChargeRupees * 100) : 0;
  }, [shipQuotes, selectedShiprocketCourierId]);
  const grandTotalPaise = subtotalPaise + deliveryPaise;

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
          ...(l.colorKey?.trim() ? { colorKey: l.colorKey.trim() } : {}),
          ...(l.customerImageUrl?.trim()
            ? { customerImageUrl: l.customerImageUrl.trim() }
            : {}),
          ...(l.customerNotes?.trim() ? { customerNotes: l.customerNotes.trim() } : {}),
        })),
        shipping: ship,
        paymentMethod: "cod",
        ...(selectedShiprocketCourierId
          ? { shiprocketCourierId: selectedShiprocketCourierId }
          : {}),
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
          ...(l.colorKey?.trim() ? { colorKey: l.colorKey.trim() } : {}),
          ...(l.customerImageUrl?.trim()
            ? { customerImageUrl: l.customerImageUrl.trim() }
            : {}),
          ...(l.customerNotes?.trim() ? { customerNotes: l.customerNotes.trim() } : {}),
        })),
        shipping: ship,
        paymentMethod: "online",
        ...(selectedShiprocketCourierId
          ? { shiprocketCourierId: selectedShiprocketCourierId }
          : {}),
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
        {ship.postalCode.replace(/\D/g, "").length === 6 ? (
          <div className="rounded-xl border border-sand-deep/80 bg-sand/20 p-4">
            <p className="text-sm font-medium text-ink">Delivery options (Shiprocket)</p>
            <p className="mt-1 text-xs text-ink-muted">
              Estimated courier charges for your pincode. The total below includes this delivery
              estimate (same as charged on Razorpay or your COD invoice).
            </p>
            {shipQuoteLoading ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-ink-muted">
                <Spinner size="sm" />
                Loading quotes…
              </p>
            ) : null}
            {shipQuoteErr ? <p className="mt-2 text-xs text-rose">{shipQuoteErr}</p> : null}
            {!shipQuoteLoading && shipQuotes.length > 0 ? (
              <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
                {shipQuotes.map((c) => (
                  <li key={c.courierId}>
                    <label className="flex cursor-pointer gap-3 rounded-lg border border-sand-deep bg-white p-2 has-[:checked]:border-accent">
                      <input
                        type="radio"
                        name="sr-courier"
                        className="mt-1"
                        checked={selectedShiprocketCourierId === c.courierId}
                        onChange={() => setSelectedShiprocketCourierId(c.courierId)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-ink">{c.courierName}</span>
                        <span className="mt-1 block text-xs text-ink-muted">
                          Freight {formatInrFromPaise(Math.round(c.freightChargeRupees * 100))}
                          {payMode === "cod" && c.codChargesRupees > 0
                            ? ` · COD charges ${formatInrFromPaise(Math.round(c.codChargesRupees * 100))}`
                            : null}
                          {" · "}
                          Total {formatInrFromPaise(Math.round(c.totalChargeRupees * 100))}
                          {c.estimatedDeliveryDays ? ` · ~${c.estimatedDeliveryDays} days` : null}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
            {!shipQuoteLoading && !shipQuoteErr && shipQuotes.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">
                Quotes unavailable (configure Shiprocket or check pincode).
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="space-y-4 rounded-2xl border border-sand-deep bg-white p-6">
        <h2 className="font-display text-xl text-ink">Summary</h2>
        <p className="text-sm text-ink-muted">
          {lines.reduce((n, l) => n + l.quantity, 0)} items
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4 text-ink-muted">
            <dt>Subtotal</dt>
            <dd className="text-ink">{formatInrFromPaise(subtotalPaise)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-ink-muted">
            <dt>Delivery (estimate)</dt>
            <dd className="text-ink">{formatInrFromPaise(deliveryPaise)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-sand-deep pt-2 font-display text-xl text-ink">
            <dt>Total</dt>
            <dd>{formatInrFromPaise(grandTotalPaise)}</dd>
          </div>
        </dl>
        {ship.postalCode.replace(/\D/g, "").length === 6 &&
        !shipQuoteLoading &&
        shipQuotes.length === 0 &&
        !shipQuoteErr ? (
          <p className="mt-2 text-xs text-amber-800">
            No courier quotes — delivery will show as ₹0 until quotes load or Shiprocket is configured.
          </p>
        ) : null}

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
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-60"
        >
          {busy ? (
            <>
              <Spinner size="sm" className="text-white" />
              Processing…
            </>
          ) : payMode === "cod" ? (
            "Place order (COD)"
          ) : (
            "Pay with Razorpay"
          )}
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
