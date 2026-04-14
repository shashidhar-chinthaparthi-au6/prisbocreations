"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { useCart } from "@/components/cart/CartProvider";
import { apiFetch } from "@/lib/api/fetch-client";
import { AddressFormModal, type AddressFormValue } from "@/components/account/AddressFormModal";
import { formatInrFromPaise } from "@/lib/format";
import type { MeUserDto } from "@/lib/user-me-dto";
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

/** Set to `true` when Razorpay online checkout should be offered again. */
const ONLINE_CHECKOUT_ENABLED = false;

type ShipCourierRow = {
  courierId: number;
  courierName: string;
  freightChargeRupees: number;
  codChargesRupees: number;
  totalChargeRupees: number;
  estimatedDeliveryDays?: string;
  rating?: number;
};

const REGISTER_NEXT = "/login?next=/checkout&tab=register";

export function CheckoutClient({
  isAuthenticated,
  defaultEmail = "",
  initialGuestCheckout = false,
}: {
  isAuthenticated: boolean;
  defaultEmail?: string;
  initialGuestCheckout?: boolean;
}) {
  const router = useRouter();
  const { lines, subtotalPaise, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<PayMode>(ONLINE_CHECKOUT_ENABLED ? "razorpay" : "cod");
  const [guestEmail, setGuestEmail] = useState(defaultEmail);
  const [proceedAsGuest, setProceedAsGuest] = useState(
    () => isAuthenticated || initialGuestCheckout,
  );
  const [modalAuthTab, setModalAuthTab] = useState<"login" | "register">("register");
  /** After mount, render auth modal on `document.body` so `fixed` covers the full viewport (not clipped/stacked under `main` / header). */
  const [authModalPortal, setAuthModalPortal] = useState(false);
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
  const [savedAddresses, setSavedAddresses] = useState<MeUserDto["addresses"] | null>(null);
  const [savedAddrIdx, setSavedAddrIdx] = useState(-1);
  const [checkoutAddrOpen, setCheckoutAddrOpen] = useState(false);
  const [checkoutAddrSaving, setCheckoutAddrSaving] = useState(false);
  const [checkoutAddrErr, setCheckoutAddrErr] = useState<string | null>(null);
  const [shipQuotes, setShipQuotes] = useState<ShipCourierRow[]>([]);
  const [shipQuoteLoading, setShipQuoteLoading] = useState(false);
  const [shipQuoteErr, setShipQuoteErr] = useState<string | null>(null);
  const [selectedShiprocketCourierId, setSelectedShiprocketCourierId] = useState<number | null>(
    null,
  );

  function chooseGuestCheckout() {
    setProceedAsGuest(true);
    router.replace("/checkout?guest=1", { scroll: false });
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedAddresses(null);
      setSavedAddrIdx(-1);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ user: MeUserDto }>("/api/v1/auth/me");
        if (!cancelled) setSavedAddresses(data.user.addresses ?? []);
      } catch {
        if (!cancelled) setSavedAddresses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && !proceedAsGuest) return;
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
            cod: !ONLINE_CHECKOUT_ENABLED || payMode === "cod",
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
  }, [isAuthenticated, proceedAsGuest, ship.postalCode, payMode]);

  const deliveryPaise = useMemo(() => {
    const row = shipQuotes.find((c) => c.courierId === selectedShiprocketCourierId);
    return row ? Math.round(row.totalChargeRupees * 100) : 0;
  }, [shipQuotes, selectedShiprocketCourierId]);
  const grandTotalPaise = subtotalPaise + deliveryPaise;

  async function submitCheckoutNewAddress(v: AddressFormValue) {
    setCheckoutAddrErr(null);
    setCheckoutAddrSaving(true);
    try {
      await apiFetch("/api/v1/auth/me/addresses", {
        method: "POST",
        body: JSON.stringify(v),
      });
      const data = await apiFetch<{ user: MeUserDto }>("/api/v1/auth/me");
      const list = data.user.addresses ?? [];
      setSavedAddresses(list);
      const last = list[list.length - 1];
      if (last) {
        setShip({
          fullName: last.fullName,
          phone: last.phone,
          line1: last.line1,
          line2: last.line2,
          city: last.city,
          state: last.state,
          postalCode: last.postalCode,
          country: last.country || "India",
        });
        setSavedAddrIdx(list.length - 1);
      }
      setCheckoutAddrOpen(false);
    } catch (e) {
      setCheckoutAddrErr(e instanceof Error ? e.message : "Could not save address");
    } finally {
      setCheckoutAddrSaving(false);
    }
  }

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
    if (!ONLINE_CHECKOUT_ENABLED) {
      await submitCod();
      return;
    }
    if (payMode === "cod") await submitCod();
    else await payOnline();
  }

  const accountGateOpen = Boolean(!isAuthenticated && !proceedAsGuest && lines.length);

  useEffect(() => {
    setAuthModalPortal(true);
  }, []);

  useEffect(() => {
    if (!accountGateOpen) return;
    const main = document.getElementById("site-main-scroll");
    const prev = main?.style.overflow;
    if (main) main.style.overflow = "hidden";
    return () => {
      if (main) main.style.overflow = prev ?? "";
    };
  }, [accountGateOpen]);

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

  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  const authGateOverlay = accountGateOpen ? (
    <div className="fixed inset-0 z-[200] overflow-y-auto overflow-x-hidden overscroll-y-contain bg-ink/50 backdrop-blur-sm">
      <div className="flex min-h-dvh w-full items-center justify-center px-4 py-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-account-gate-title"
          className="my-auto w-full max-w-xl rounded-2xl border border-sand-deep bg-gradient-to-b from-white to-sand/50 p-5 shadow-2xl sm:p-7"
        >
            <p className="text-center text-sm text-ink-muted">
              {itemCount} {itemCount === 1 ? "item" : "items"} in your cart ·{" "}
              <span className="font-medium text-ink">{formatInrFromPaise(subtotalPaise)}</span>{" "}
              before delivery
            </p>
            <p className="mt-2 text-center text-xs font-semibold uppercase tracking-wider text-accent">
              Recommended
            </p>
            <h2
              id="checkout-account-gate-title"
              className="mt-0.5 text-center font-display text-2xl text-ink sm:text-3xl"
            >
              Sign in or create an account
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-center text-sm text-ink-muted">
              Your bag stays in this browser — finish below and you&apos;ll stay on checkout with the
              same items. Or continue as a guest at the bottom.
            </p>
            <ul className="mx-auto mt-3 max-w-md space-y-1 text-xs text-ink sm:text-sm">
              <li className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  ✓
                </span>
                Track orders and save addresses
              </li>
              <li className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  ✓
                </span>
                Same cart after you sign in or register
              </li>
            </ul>
            <div className="mt-4 flex rounded-full border border-sand-deep bg-white/80 p-1 text-sm font-medium shadow-sm">
              <button
                type="button"
                onClick={() => setModalAuthTab("login")}
                className={`min-h-10 flex-1 rounded-full px-3 transition ${
                  modalAuthTab === "login"
                    ? "bg-ink text-white shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setModalAuthTab("register")}
                className={`min-h-10 flex-1 rounded-full px-3 transition ${
                  modalAuthTab === "register"
                    ? "bg-accent text-white shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Create account
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-sand-deep/80 bg-white/90 p-3.5 sm:p-4">
              {modalAuthTab === "login" ? (
                <LoginForm nextPath="/checkout" />
              ) : (
                <RegisterForm nextPath="/checkout" />
              )}
            </div>
            <div className="mt-5 border-t border-sand-deep/80 pt-4 text-center">
              <p className="text-xs text-ink-muted">
                Prefer not to create an account? You can still check out — we&apos;ll email your
                confirmation to the address you provide.
              </p>
              <button
                type="button"
                onClick={chooseGuestCheckout}
                className="mt-3 text-sm font-medium text-ink-muted underline decoration-sand-deep underline-offset-4 transition hover:text-accent"
              >
                Continue as guest
              </button>
            </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {authModalPortal && authGateOverlay
        ? createPortal(authGateOverlay, document.body)
        : authGateOverlay}

      <div
        className={`space-y-6 ${accountGateOpen ? "pointer-events-none select-none opacity-[0.38]" : ""}`}
        aria-hidden={accountGateOpen}
      >
        {!isAuthenticated && proceedAsGuest ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sand-deep/80 bg-sand/30 px-4 py-3 text-sm text-ink-muted">
            <span>
              Guest checkout — create an account later from your order email, or{" "}
              <Link href={REGISTER_NEXT} className="font-medium text-accent hover:underline">
                sign up now
              </Link>{" "}
              for tracking.
            </span>
          </div>
        ) : null}
        <div className="grid gap-10 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-sand-deep bg-white p-6">
        <h2 className="font-display text-xl text-ink">Shipping</h2>
        {isAuthenticated ? (
          savedAddresses === null ? (
            <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
              <Spinner size="sm" />
              Loading your saved addresses…
            </p>
          ) : savedAddresses.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-sand-deep/80 bg-sand/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <label className="block min-w-0 flex-1 text-sm">
                  <span className="text-ink-muted">Use saved address</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-sand-deep bg-white px-3 py-2"
                    value={savedAddrIdx}
                    onChange={(e) => {
                      const i = Number(e.target.value);
                      setSavedAddrIdx(i);
                      if (i >= 0 && savedAddresses[i]) {
                        const a = savedAddresses[i];
                        setShip({
                          fullName: a.fullName,
                          phone: a.phone,
                          line1: a.line1,
                          line2: a.line2,
                          city: a.city,
                          state: a.state,
                          postalCode: a.postalCode,
                          country: a.country || "India",
                        });
                      }
                    }}
                  >
                    <option value={-1}>Enter manually below</option>
                    {savedAddresses.map((a, i) => (
                      <option key={i} value={i}>
                        {[a.line1, a.city, a.postalCode].filter(Boolean).join(" · ")}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutAddrErr(null);
                      setCheckoutAddrOpen(true);
                    }}
                    className="rounded-lg border border-sand-deep bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-sand/50"
                  >
                    New address
                  </button>
                  <Link
                    href="/account"
                    className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-accent hover:underline"
                  >
                    Manage in profile
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium text-ink">No saved addresses yet</p>
              <p className="mt-1 text-amber-950/90">
                Add a delivery address here or from your profile. We&apos;ll fill the form for you.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutAddrErr(null);
                    setCheckoutAddrOpen(true);
                  }}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light"
                >
                  Add address
                </button>
                <Link
                  href="/account"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  Open profile
                </Link>
              </div>
            </div>
          )
        ) : null}
        {!isAuthenticated && proceedAsGuest ? (
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
          {!ONLINE_CHECKOUT_ENABLED ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-3 text-sm text-amber-950">
              <p className="font-medium text-ink">Pay online — temporarily unavailable</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-950/95">
                We&apos;re pausing card / UPI checkout for a short time. It will be back soon. Please
                use <strong>cash on delivery</strong> below to complete your order.
              </p>
            </div>
          ) : (
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
          )}
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
        {ONLINE_CHECKOUT_ENABLED && payMode === "razorpay" ? (
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
      </div>

      <AddressFormModal
        open={checkoutAddrOpen}
        title="Add delivery address"
        saving={checkoutAddrSaving}
        error={checkoutAddrErr}
        onClose={() => {
          if (checkoutAddrSaving) return;
          setCheckoutAddrOpen(false);
          setCheckoutAddrErr(null);
        }}
        onSubmit={(v) => {
          void submitCheckoutNewAddress(v);
        }}
      />
    </>
  );
}
