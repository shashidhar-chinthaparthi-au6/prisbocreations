"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/cart/CartProvider";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Spinner } from "@/components/ui/Spinner";
import { StepIndicator } from "@/components/checkout/StepIndicator";
import { apiFetch } from "@/lib/api/fetch-client";
import { formatInrFromPaise } from "@/lib/format";
import { freeShippingMinRupeesWhole, qualifiesForFreeShipping } from "@/lib/free-shipping";
import { useCheckoutStore } from "@/lib/store/checkout-store";
import { freeShippingMinPaise } from "@/lib/free-shipping";
import { mergeGuestCartAfterSignIn } from "@/lib/auth/post-signin-cart";
import { mergeWishlistAfterSignIn } from "@/lib/auth/sync-wishlist-after-login";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { INDIAN_STATES, isIndianState } from "@/lib/indian-states";
import type { MeUserDto } from "@/lib/user-me-dto";
import { StoreMedia } from "@/components/store/StoreMedia";
import { registerFieldsSchema } from "@/lib/validators/auth";
import { validateClientCustomization } from "@/lib/customization-client-validate";

const ACCENT = "bg-[#C47A2B] hover:bg-[#b06d26]";

type ShipRow = {
  courierId: number;
  courierName: string;
  totalChargeRupees: number;
};

export function CheckoutFlowClient({
  isAuthenticated: serverAuth,
  defaultEmail = "",
}: {
  isAuthenticated: boolean;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const { data: clientSession, status: sessionStatus } = useSession();
  const isLoggedIn = Boolean(clientSession?.user?.id) || serverAuth;

  const { lines, subtotalPaise, clear } = useCart();
  const {
    guestEmail,
    guestPhone,
    setGuestContact,
    shippingForm,
    setShippingForm,
    selectedAddressIdx,
    setSelectedAddressIdx,
    saveAddress,
    setSaveAddress,
    couponCode,
    couponDiscountPaise,
    couponValid,
    applyCoupon,
    removeCoupon,
    paymentMethod,
    currentStep,
    setCurrentStep,
    goToStep,
    placing,
    setPlacing,
    idempotencyKey,
    setIdempotencyKey,
    reset: resetCheckout,
  } = useCheckoutStore();

  const [savedAddresses, setSavedAddresses] = useState<MeUserDto["addresses"] | null>(null);
  const [meLoading, setMeLoading] = useState(isLoggedIn);
  const [addrExpanded, setAddrExpanded] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkEmailLoading, setCheckEmailLoading] = useState(false);
  const [accountPwd, setAccountPwd] = useState("");
  const [guestAccountFullName, setGuestAccountFullName] = useState("");
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [busyAuth, setBusyAuth] = useState(false);
  const [pinHint, setPinHint] = useState<string | null>(null);
  const [pinValid, setPinValid] = useState<boolean | null>(null);
  const [deliveryEst, setDeliveryEst] = useState<{ days: string; cod: boolean; serviceable: boolean } | null>(
    null,
  );
  const [shipRows, setShipRows] = useState<ShipRow[]>([]);
  const [shipCourierId, setShipCourierId] = useState<number | null>(null);
  const [shipLoading, setShipLoading] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  /** Shown on the shipping step only (validateShipping). `submitErr` is for review/place-order. */
  const [shippingErr, setShippingErr] = useState<string | null>(null);
  const [stockModal, setStockModal] = useState<{ items: { name: string; message: string }[] } | null>(null);

  const emailDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guestFlow = !isLoggedIn;
  const labels = guestFlow
    ? ["Contact", "Shipping", "Payment", "Review"]
    : ["Shipping", "Payment", "Review"];
  const maxStep = labels.length - 1;

  useEffect(() => {
    if (defaultEmail && !guestEmail) {
      setGuestContact(defaultEmail, guestPhone);
    }
  }, [defaultEmail, guestEmail, guestPhone, setGuestContact]);

  useEffect(() => {
    if (!isLoggedIn) {
      setMeLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ user: MeUserDto }>("/api/v1/auth/me");
        if (!cancelled) {
          setSavedAddresses(data.user.addresses ?? []);
          if ((data.user.addresses?.length ?? 0) > 0 && selectedAddressIdx === null) {
            setSelectedAddressIdx(0);
            const a = data.user.addresses![0];
            setShippingForm({
              fullName: a.fullName,
              phone: a.phone,
              line1: a.line1,
              line2: a.line2 ?? "",
              city: a.city,
              state: a.state,
              pincode: a.postalCode,
              country: a.country || "India",
            });
          }
        }
      } catch {
        if (!cancelled) setSavedAddresses([]);
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, selectedAddressIdx, setSelectedAddressIdx, setShippingForm]);

  useEffect(() => {
    setShippingErr(null);
  }, [shippingForm]);

  useEffect(() => {
    const s = Number(currentStep);
    const n = Number.isFinite(s) ? s : 0;
    if (n > maxStep) setCurrentStep(maxStep);
  }, [currentStep, maxStep, setCurrentStep]);

  useEffect(() => {
    const pin = shippingForm.pincode.replace(/\D/g, "");
    if (pin.length !== 6) {
      setDeliveryEst(null);
      return;
    }
    const defaultKg = 0.5;
    const wRaw = lines.reduce((s, l) => s + defaultKg * l.quantity, 0);
    const weight = Math.max(0.1, Math.round(wRaw * 10) / 10);
    const cartTotal = (subtotalPaise / 100).toFixed(2);
    const isCOD = paymentMethod === "COD";
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({
          pincode: pin,
          cartTotal,
          weight: String(weight),
          isCOD: String(isCOD),
        });
        const r = await fetch(`/api/delivery-estimate?${qs.toString()}`);
        const j = (await r.json()) as {
          ok?: boolean;
          data?: { days?: string; isCODAvailable?: boolean; serviceable?: boolean };
        };
        if (!cancelled && j.ok && j.data) {
          setDeliveryEst({
            days: j.data.days ?? "5-7",
            cod: j.data.isCODAvailable !== false,
            serviceable: j.data.serviceable !== false,
          });
        }
      } catch {
        if (!cancelled) setDeliveryEst(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shippingForm.pincode, lines, subtotalPaise, paymentMethod]);

  useEffect(() => {
    const pin = shippingForm.pincode.replace(/\D/g, "");
    if (pin.length !== 6) {
      setShipRows([]);
      setShipCourierId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setShipLoading(true);
      try {
        const res = await fetch("/api/v1/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryPostalCode: pin, cod: true }),
        });
        if (res.status === 503) {
          if (!cancelled) {
            setShipRows([]);
            setShipCourierId(null);
          }
          return;
        }
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { couriers?: ShipRow[] };
        };
        const rows = json.data?.couriers ?? [];
        if (!cancelled) {
          setShipRows(rows);
          setShipCourierId(rows[0]?.courierId ?? null);
        }
      } catch {
        if (!cancelled) {
          setShipRows([]);
          setShipCourierId(null);
        }
      } finally {
        if (!cancelled) setShipLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shippingForm.pincode]);

  const quotedDeliveryPaise = useMemo(() => {
    const row = shipRows.find((c) => c.courierId === shipCourierId);
    return row ? Math.round(row.totalChargeRupees * 100) : 0;
  }, [shipRows, shipCourierId]);

  const freeShip = qualifiesForFreeShipping(subtotalPaise);
  const deliveryPaise = freeShip ? 0 : quotedDeliveryPaise;
  const grandTotalPaise = Math.max(0, subtotalPaise - (couponValid ? couponDiscountPaise : 0) + deliveryPaise);

  const checkEmailBlur = useCallback(
    (email: string) => {
      if (emailDebounce.current) clearTimeout(emailDebounce.current);
      emailDebounce.current = setTimeout(async () => {
        const em = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
          setEmailExists(null);
          return;
        }
        setCheckEmailLoading(true);
        try {
          const r = await fetch(`/api/auth/check-email?email=${encodeURIComponent(em)}`);
          const j = (await r.json()) as { ok?: boolean; data?: { exists?: boolean } };
          setEmailExists(Boolean(j.data?.exists));
        } catch {
          setEmailExists(null);
        } finally {
          setCheckEmailLoading(false);
        }
      }, 400);
    },
    [],
  );

  const onPinLookup = useCallback(async (raw: string) => {
    const pin = raw.replace(/\D/g, "").slice(0, 6);
    if (pin.length !== 6) {
      setPinHint(null);
      setPinValid(null);
      return;
    }
    try {
      const r = await fetch(`/api/pincode?code=${encodeURIComponent(pin)}`);
      const j = (await r.json()) as { ok?: boolean; data?: { valid?: boolean; city?: string; state?: string } };
      if (j.ok && j.data?.valid && j.data.city && j.data.state) {
        setPinValid(true);
        setPinHint(`✓ ${j.data.city}, ${j.data.state}`);
        setShippingForm({ city: j.data.city, state: j.data.state, pincode: pin });
      } else if (j.ok && j.data?.valid && j.data?.state) {
        setPinValid(true);
        setPinHint(`✓ ${j.data.state}`);
        setShippingForm({ state: j.data.state, pincode: pin });
      } else {
        setPinValid(false);
        setPinHint("PIN code not found — you can still enter city and state manually.");
      }
    } catch {
      setPinValid(null);
      setPinHint(null);
    }
  }, [setShippingForm]);

  async function applyCouponClick() {
    const code = couponInput.trim() || couponCode;
    if (!code) return;
    setCouponBusy(true);
    setCouponErr(null);
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
        setCouponErr(j.data?.message ?? "Invalid or expired coupon code");
        return;
      }
      applyCoupon(code.toUpperCase(), j.data.discountPaise ?? 0);
      setCouponInput(code.toUpperCase());
    } catch {
      setCouponErr("Could not apply coupon");
    } finally {
      setCouponBusy(false);
    }
  }

  function validateShipping(): string | null {
    const s = shippingForm;
    if (s.fullName.trim().length < 2) return "Enter full name";
    if (!/^[6-9]\d{9}$/.test(s.phone.replace(/\D/g, ""))) return "Enter a valid 10-digit phone number";
    if (s.line1.trim().length < 5) return "Enter address line 1";
    if (!s.city.trim()) return "Enter city";
    if (!isIndianState(s.state)) return "Select a valid state";
    if (!/^\d{6}$/.test(s.pincode.replace(/\D/g, ""))) return "Enter a 6-digit PIN code";
    return null;
  }

  function validateContact(): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) return "Enter a valid email";
    if (!/^[6-9]\d{9}$/.test(guestPhone.replace(/\D/g, ""))) return "Enter a valid 10-digit phone";
    return null;
  }

  async function registerAndContinue() {
    setAuthErr(null);
    const v = validateContact();
    if (v) {
      setAuthErr(v);
      return;
    }
    const phoneDigits = guestPhone.replace(/\D/g, "").match(/^[6-9]\d{9}$/)?.[0];
    const parsed = registerFieldsSchema.safeParse({
      fullName: guestAccountFullName.trim(),
      email: guestEmail.trim().toLowerCase(),
      password: accountPwd,
      phone: phoneDigits,
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setAuthErr(
        flat.fullName?.[0] ??
          flat.email?.[0] ??
          flat.phone?.[0] ??
          flat.password?.[0] ??
          "Check the form and try again",
      );
      return;
    }
    setBusyAuth(true);
    const wishSnapshot = useWishlistStore.getState().ids.slice();
    useWishlistStore.setState({ mergeInProgress: true });
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        errors?: Record<string, string[] | undefined>;
      };
      if (res.status === 429) {
        setAuthErr(
          j.error ??
            "Too many accounts created from this device. Please try again in an hour.",
        );
        return;
      }
      if (res.status === 422 && j.errors) {
        const msg =
          j.errors.fullName?.[0] ??
          j.errors.email?.[0] ??
          j.errors.phone?.[0] ??
          j.errors.password?.[0];
        setAuthErr(msg ?? "Could not create account");
        return;
      }
      if (res.status === 409) {
        setAuthErr(j.errors?.email?.[0] ?? "An account with this email already exists");
        return;
      }
      if (!res.ok || !j.ok) {
        setAuthErr(j.error ?? "Could not create account");
        return;
      }
      const sign = await signIn("credentials", {
        email: parsed.data.email,
        password: accountPwd,
        redirect: false,
      });
      if (sign?.error) {
        setAuthErr("Account created but sign-in failed. Please sign in manually.");
        return;
      }
      try {
        await mergeWishlistAfterSignIn(wishSnapshot);
      } catch {
        /* non-blocking */
      }
      try {
        await mergeGuestCartAfterSignIn();
      } catch {
        /* non-blocking */
      }
      try {
        const cr = await fetch("/api/auth/claim-guest-orders", {
          method: "POST",
          credentials: "include",
        });
        if (cr.ok) {
          const cj = (await cr.json()) as { ok?: boolean; data?: { claimed?: number } };
          const claimed = cj.data?.claimed ?? 0;
          if (claimed > 0) {
            const { dispatchStoreToast } = await import("@/components/store/StoreToaster");
            dispatchStoreToast(
              `${claimed} previous order${claimed > 1 ? "s" : ""} linked to your account!`,
            );
          }
        }
      } catch {
        /* non-blocking */
      }
      setAccountPwd("");
      setGuestAccountFullName("");
      goToStep(0);
    } catch {
      setAuthErr("Something went wrong");
    } finally {
      useWishlistStore.setState({ mergeInProgress: false });
      setBusyAuth(false);
    }
  }

  async function signInAndContinue() {
    setAuthErr(null);
    const v = validateContact();
    if (v) {
      setAuthErr(v);
      return;
    }
    setBusyAuth(true);
    const wishSnapshotSignIn = useWishlistStore.getState().ids.slice();
    useWishlistStore.setState({ mergeInProgress: true });
    try {
      const sign = await signIn("credentials", {
        email: guestEmail.trim().toLowerCase(),
        password: accountPwd,
        redirect: false,
      });
      if (sign?.error) {
        setAuthErr("Incorrect password. Try again.");
        return;
      }
      await mergeWishlistAfterSignIn(wishSnapshotSignIn);
      await mergeGuestCartAfterSignIn();
      setAccountPwd("");
      goToStep(0);
    } catch {
      setAuthErr("Sign in failed");
    } finally {
      useWishlistStore.setState({ mergeInProgress: false });
      setBusyAuth(false);
    }
  }

  async function saveAddressIfNeeded() {
    if (!isLoggedIn || !saveAddress) return;
    const s = shippingForm;
    const err = validateShipping();
    if (err) throw new Error(err);
    await apiFetch("/api/v1/auth/me/addresses", {
      method: "POST",
      body: JSON.stringify({
        fullName: s.fullName,
        phone: s.phone,
        line1: s.line1,
        line2: s.line2 || undefined,
        city: s.city,
        state: s.state,
        postalCode: s.pincode.replace(/\D/g, "").slice(0, 6),
        country: s.country || "India",
      }),
    });
  }

  async function placeOrder() {
    setSubmitErr(null);
    for (const l of lines) {
      if (!l.customizationSchema?.length) continue;
      const v = validateClientCustomization(
        l.customizationSchema,
        l.customizationData ?? {},
        l.customizationFiles ?? {},
      );
      if (!v.ok) {
        setSubmitErr(
          "Some items still need personalisation. Open your cart, complete every required field, then try again.",
        );
        return;
      }
    }
    const shipErr = validateShipping();
    if (shipErr) {
      setSubmitErr(shipErr);
      goToStep(guestFlow ? 1 : 0);
      return;
    }
    if (deliveryEst && !deliveryEst.cod) {
      setSubmitErr("Cash on delivery is not available for your area. Contact us to arrange delivery.");
      return;
    }
    const idem = idempotencyKey ?? (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`);
    setIdempotencyKey(idem);

    setPlacing(true);
    try {
      await saveAddressIfNeeded().catch(() => {});
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idem,
        },
        body: JSON.stringify({
          lines: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            ...(l.optionKey ? { optionKey: l.optionKey } : {}),
            ...(l.colorKey?.trim() ? { colorKey: l.colorKey.trim() } : {}),
            ...(l.customerImageUrl?.trim() ? { customerImageUrl: l.customerImageUrl.trim() } : {}),
            ...(l.customerNotes?.trim() ? { customerNotes: l.customerNotes.trim() } : {}),
            ...(l.giftWrap ? { giftWrap: true } : {}),
            ...(l.giftMessage?.trim() ? { giftMessage: l.giftMessage.trim() } : {}),
            ...(l.customizationData && Object.keys(l.customizationData).length ?
              { customizationData: l.customizationData }
            : {}),
            ...(l.customizationFiles && Object.keys(l.customizationFiles).length ?
              { customizationFiles: l.customizationFiles }
            : {}),
          })),
          shipping: {
            fullName: shippingForm.fullName.trim(),
            phone: shippingForm.phone.replace(/\D/g, "").slice(0, 15),
            line1: shippingForm.line1.trim(),
            line2: shippingForm.line2.trim() || undefined,
            city: shippingForm.city.trim(),
            state: shippingForm.state.trim(),
            postalCode: shippingForm.pincode.replace(/\D/g, "").slice(0, 6),
            country: shippingForm.country.trim() || "India",
          },
          paymentMethod: "cod",
          shiprocketCourierId: shipCourierId ?? undefined,
          couponCode: couponValid ? couponCode : undefined,
          guestEmail: !isLoggedIn ? guestEmail.trim().toLowerCase() : undefined,
          guestPhone: !isLoggedIn ? guestPhone.replace(/\D/g, "").slice(0, 15) : undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        conflictItems?: { name: string; message: string }[];
        data?: Record<string, unknown> & {
          _id?: string;
          orderNumber?: string;
          invoiceNumber?: string;
        };
      };
      if (res.status === 409 && json.conflictItems?.length) {
        setStockModal({ items: json.conflictItems });
        setSubmitErr(json.error ?? "Stock update — update your cart and try again.");
        return;
      }
      if (!res.ok || !json.ok || !json.data) {
        setSubmitErr(json.error ?? "Order failed");
        return;
      }
      clear();
      resetCheckout();
      const d = json.data;
      const num =
        (typeof d.orderNumber === "string" && d.orderNumber) ||
        (typeof d.invoiceNumber === "string" && d.invoiceNumber) ||
        String(d._id ?? "");
      const em = !isLoggedIn ? guestEmail : clientSession?.user?.email ?? "";
      router.replace(`/checkout/success?order=${encodeURIComponent(num)}&email=${encodeURIComponent(em)}`);
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : "Order failed");
    } finally {
      setPlacing(false);
    }
  }

  useEffect(() => {
    const s = Number(currentStep);
    const n = Number.isFinite(s) ? s : 0;
    if (n === maxStep && !idempotencyKey) {
      const k = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
      setIdempotencyKey(k);
    }
  }, [currentStep, maxStep, idempotencyKey, setIdempotencyKey]);

  if (!lines.length) {
    return (
      <p className="text-[#6B6560]">
        Your cart is empty.{" "}
        <Link href="/products" className="font-medium text-[#C47A2B] underline">
          Browse products
        </Link>
      </p>
    );
  }

  if (sessionStatus === "loading" || (isLoggedIn && meLoading)) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const stepSafe = (() => {
    const n = Number(currentStep);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  })();
  const stepIdx = Math.min(stepSafe, maxStep);
  const showContact = guestFlow && stepSafe === 0;
  const showShipping = (guestFlow && stepSafe === 1) || (!guestFlow && stepSafe === 0);
  const showPayment = (guestFlow && stepSafe === 2) || (!guestFlow && stepSafe === 1);
  const showReview = (guestFlow && stepSafe === 3) || (!guestFlow && stepSafe === 2);

  return (
    <div className="space-y-8">
      {stockModal ? (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/40 px-4" role="alertdialog">
          <div className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg text-[#3D3835]">Stock update</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#6B6560]">
              {stockModal.items.map((it, i) => (
                <li key={i}>
                  {it.name}: {it.message}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`mt-5 w-full rounded-full py-3 text-sm font-semibold text-white ${ACCENT}`}
              onClick={() => {
                setStockModal(null);
                router.push("/cart");
              }}
            >
              Update cart and continue
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#E8E0D6] bg-white p-4 shadow-sm">
        <StepIndicator labels={labels} current={stepIdx} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,580px)_minmax(280px,1fr)] lg:items-start">
        <div className="space-y-6">
          {showContact ? (
            <section className="space-y-4">
              <h2 className="font-display text-xl text-[#3D3835]">Contact</h2>
              <label className="block text-sm">
                <span className="text-[#6B6560]">Email address *</span>
                <input
                  type="email"
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg border border-[#E8E0D6] px-3 py-2.5"
                  value={guestEmail}
                  onChange={(e) => setGuestContact(e.target.value, guestPhone)}
                  onBlur={(e) => checkEmailBlur(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-[#6B6560]">Phone number *</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  className="mt-1 w-full rounded-lg border border-[#E8E0D6] px-3 py-2.5"
                  value={guestPhone}
                  onChange={(e) => setGuestContact(guestEmail, e.target.value)}
                />
              </label>

              {checkEmailLoading ? (
                <p className="text-xs text-[#6B6560]">Checking email…</p>
              ) : null}

              {emailExists === false ? (
                <div
                  className="mt-4 rounded-[10px] border border-[#E8E0D6] bg-[#FDFAF7] p-4 text-sm"
                >
                  <p className="text-[13px] font-semibold text-[#1A1A1A]">Save time on future orders</p>
                  <p className="mt-2 text-xs leading-relaxed text-[#6B6560]">
                    Create a free account to track orders, save addresses, and checkout faster next time.
                  </p>
                  <label className="mt-3 block text-sm font-medium text-[#1A1A1A]">
                    <span className="mb-1 block text-xs font-normal text-[#6B6560]">Full name *</span>
                    <input
                      autoComplete="name"
                      className="mt-1 w-full rounded-lg border border-[#E8E0D6] bg-white px-3 py-2.5 text-[#1A1A1A]"
                      value={guestAccountFullName}
                      onChange={(e) => setGuestAccountFullName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </label>
                  <div className="mt-3 space-y-2">
                    <PasswordInput
                      label="Choose a password"
                      value={accountPwd}
                      onChange={setAccountPwd}
                      autoComplete="new-password"
                    />
                    <PasswordStrength password={accountPwd} />
                  </div>
                  <button
                    type="button"
                    disabled={busyAuth}
                    onClick={() => void registerAndContinue()}
                    className={`mt-3 w-full rounded-full py-3 text-sm font-semibold text-white ${ACCENT}`}
                  >
                    {busyAuth ? "Working…" : "Create account & continue →"}
                  </button>
                  <button
                    type="button"
                    className="mt-2 w-full text-center text-sm text-[#6B6560] underline"
                    onClick={() => goToStep(1)}
                  >
                    Continue as guest
                  </button>
                </div>
              ) : null}

              {emailExists === true ? (
                <div className="rounded-xl border border-[#E8E0D6] bg-[#F5E6D0]/40 p-4 text-sm">
                  <p className="font-medium text-[#3D3835]">Welcome back!</p>
                  <p className="mt-1 text-[#6B6560]">Sign in to load your saved addresses.</p>
                  <div className="mt-3">
                    <PasswordInput label="Password" value={accountPwd} onChange={setAccountPwd} />
                  </div>
                  <button
                    type="button"
                    disabled={busyAuth}
                    onClick={() => void signInAndContinue()}
                    className={`mt-3 w-full rounded-full py-3 text-sm font-semibold text-white ${ACCENT}`}
                  >
                    {busyAuth ? "Working…" : "Sign in & continue →"}
                  </button>
                  <Link href="/forgot-password" className="mt-2 block text-center text-xs text-[#C47A2B] underline">
                    Forgot password?
                  </Link>
                  <button
                    type="button"
                    className="mt-2 w-full text-center text-sm text-[#6B6560] underline"
                    onClick={() => goToStep(1)}
                  >
                    Continue as guest
                  </button>
                </div>
              ) : null}

              {authErr ? <p className="text-sm text-rose-600">{authErr}</p> : null}

              <button
                type="button"
                onClick={() => {
                  const err = validateContact();
                  if (err) {
                    setAuthErr(err);
                    return;
                  }
                  setAuthErr(null);
                  goToStep(1);
                }}
                className={`w-full rounded-full py-3 text-sm font-semibold text-white ${ACCENT}`}
              >
                Next: Shipping address →
              </button>
            </section>
          ) : null}

          {showShipping ? (
            <section className="space-y-4">
              <h2 className="font-display text-xl text-[#3D3835]">Shipping address</h2>

              {isLoggedIn && (savedAddresses?.length ?? 0) > 0 && !addrExpanded ? (
                <div className="space-y-3">
                  {savedAddresses!.map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedAddressIdx(i);
                        setShippingForm({
                          fullName: a.fullName,
                          phone: a.phone,
                          line1: a.line1,
                          line2: a.line2 ?? "",
                          city: a.city,
                          state: a.state,
                          pincode: a.postalCode,
                          country: a.country || "India",
                        });
                      }}
                      className={`w-full rounded-xl border p-4 text-left text-sm transition ${
                        selectedAddressIdx === i
                          ? "border-[#C47A2B] ring-1 ring-[#C47A2B]"
                          : "border-[#E8E0D6] hover:border-[#d4c4b0]"
                      }`}
                    >
                      <p className="font-medium text-[#3D3835]">{a.line1}</p>
                      <p className="text-[#6B6560]">
                        {a.fullName} · {a.phone}
                      </p>
                      <p className="text-[#6B6560]">
                        {a.city}, {a.state} {a.postalCode}
                      </p>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="text-sm font-medium text-[#C47A2B] underline"
                    onClick={() => setAddrExpanded(true)}
                  >
                    + Add a new address
                  </button>
                </div>
              ) : null}

              {(addrExpanded || !isLoggedIn || (savedAddresses?.length ?? 0) === 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-[#6B6560]">Full name *</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-[#E8E0D6] px-3 py-2"
                      value={shippingForm.fullName}
                      onChange={(e) => setShippingForm({ fullName: e.target.value })}
                      autoComplete="name"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-[#6B6560]">Phone *</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-[#E8E0D6] px-3 py-2"
                      value={shippingForm.phone}
                      onChange={(e) => setShippingForm({ phone: e.target.value })}
                      autoComplete="tel"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-[#6B6560]">Address line 1 *</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-[#E8E0D6] px-3 py-2"
                      value={shippingForm.line1}
                      onChange={(e) => setShippingForm({ line1: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-[#6B6560]">Address line 2</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-[#E8E0D6] px-3 py-2"
                      value={shippingForm.line2}
                      onChange={(e) => setShippingForm({ line2: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-[#6B6560]">City *</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-[#E8E0D6] px-3 py-2"
                      value={shippingForm.city}
                      onChange={(e) => setShippingForm({ city: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-[#6B6560]">State *</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-[#E8E0D6] px-3 py-2"
                      value={shippingForm.state}
                      onChange={(e) => setShippingForm({ state: e.target.value })}
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-[#6B6560]">PIN code *</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-[#E8E0D6] px-3 py-2"
                      maxLength={6}
                      inputMode="numeric"
                      value={shippingForm.pincode}
                      onChange={(e) => setShippingForm({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      onBlur={(e) => void onPinLookup(e.target.value)}
                    />
                    {pinHint ? (
                      <span className={pinValid ? "mt-1 block text-xs text-emerald-700" : "mt-1 block text-xs text-amber-800"}>
                        {pinHint}
                      </span>
                    ) : null}
                  </label>
                  <p className="text-sm text-[#6B6560] sm:col-span-2">Country: India</p>
                </div>
              )}

              {isLoggedIn ? (
                <label className="flex items-center gap-2 text-sm text-[#3D3835]">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                  />
                  Save this address to my profile
                </label>
              ) : null}

              {deliveryEst ? (
                <div className="rounded-lg border border-[#E8E0D6] bg-[#F5F5F4] px-3 py-2 text-sm">
                  <p>
                    📦 Estimated delivery <strong>{deliveryEst.days} working days</strong>
                  </p>
                  {deliveryEst.cod ? (
                    <p className="text-emerald-800">COD available for this pincode ✓</p>
                  ) : (
                    <p className="text-amber-800">Cash on delivery is not available for your area.</p>
                  )}
                  {!deliveryEst.serviceable ? (
                    <p className="mt-1 text-amber-900">
                      We may not be able to deliver to this pincode. Continue anyway and we&apos;ll confirm by phone.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {shipLoading ? (
                <p className="text-xs text-[#6B6560]">Loading delivery options…</p>
              ) : shipRows.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#3D3835]">Courier (Shiprocket)</p>
                  <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                    {shipRows.map((c) => (
                      <li key={c.courierId}>
                        <label className="flex cursor-pointer gap-2 rounded-lg border border-[#E8E0D6] p-2 has-[:checked]:border-[#C47A2B]">
                          <input
                            type="radio"
                            name="courier"
                            checked={shipCourierId === c.courierId}
                            onChange={() => setShipCourierId(c.courierId)}
                          />
                          <span>
                            {c.courierName} — {formatInrFromPaise(Math.round(c.totalChargeRupees * 100))}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {shippingErr ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                  {shippingErr}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  const err = validateShipping();
                  if (err) {
                    setShippingErr(err);
                    return;
                  }
                  setShippingErr(null);
                  setSubmitErr(null);
                  goToStep(guestFlow ? 2 : 1);
                }}
                className={`w-full rounded-full py-3 text-sm font-semibold text-white ${ACCENT}`}
              >
                Continue to payment →
              </button>
            </section>
          ) : null}

          {showPayment ? (
            <section className="space-y-4">
              <h2 className="font-display text-xl text-[#3D3835]">Payment</h2>
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                <p className="font-medium">Online payments coming soon</p>
                <p className="mt-1 text-xs leading-relaxed">
                  We&apos;re setting up UPI and card payments. For now, all orders are Cash on Delivery.
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[#C47A2B] bg-white p-4">
                <input type="radio" className="mt-1" checked readOnly />
                <span>
                  <span className="font-medium text-[#3D3835]">Cash on delivery</span>
                  <span className="mt-0.5 block text-xs text-[#6B6560]">
                    Pay in cash when your order arrives. No online payment now.
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => goToStep(guestFlow ? 3 : 2)}
                className={`w-full rounded-full py-3 text-sm font-semibold text-white ${ACCENT}`}
              >
                Continue to review →
              </button>
            </section>
          ) : null}

          {showReview ? (
            <section className="space-y-4">
              <h2 className="font-display text-xl text-[#3D3835]">Review your order</h2>
              <div className="space-y-2 rounded-xl border border-[#E8E0D6] p-4 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">Delivering to</span>
                  <button type="button" className="text-[#C47A2B] underline" onClick={() => goToStep(guestFlow ? 1 : 0)}>
                    Edit
                  </button>
                </div>
                <p className="text-[#6B6560]">
                  {shippingForm.fullName} · {shippingForm.phone}
                  <br />
                  {shippingForm.line1}
                  {shippingForm.line2 ? (
                    <>
                      <br />
                      {shippingForm.line2}
                    </>
                  ) : null}
                  <br />
                  {shippingForm.city}, {shippingForm.state} {shippingForm.pincode}
                </p>
              </div>
              <div className="space-y-2 rounded-xl border border-[#E8E0D6] p-4 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Payment</span>
                  <button type="button" className="text-[#C47A2B] underline" onClick={() => goToStep(guestFlow ? 2 : 1)}>
                    Edit
                  </button>
                </div>
                <p>Cash on delivery</p>
              </div>
              <div className="rounded-xl border border-[#E8E0D6] p-4">
                <p className="text-sm font-medium text-[#3D3835]">Items ({lines.reduce((n, l) => n + l.quantity, 0)})</p>
                <ul className="mt-3 space-y-3">
                  {lines.map((l) => (
                    <li key={l.id} className="flex gap-3 text-sm">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#E8E0D6]">
                        {l.image ? (
                          <StoreMedia src={l.image} alt="" fill className="object-cover" sizes="56px" videoControls={false} />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#3D3835] line-clamp-2">{l.name}</p>
                        <p className="text-xs text-[#6B6560]">
                          {[l.colorLabel, l.optionLabel].filter(Boolean).join(" · ")}
                        </p>
                        <p className="text-[#3D3835]">
                          Qty {l.quantity} · {formatInrFromPaise(l.pricePaise * l.quantity)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-[#6B6560]">
                By placing this order you agree to our Terms of Service. We&apos;ll confirm your order by email.
              </p>
              {submitErr ? <p className="text-sm text-rose-600">{submitErr}</p> : null}
              <button
                type="button"
                disabled={placing}
                onClick={() => void placeOrder()}
                className={`flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-semibold text-white disabled:opacity-60 ${ACCENT}`}
              >
                {placing ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    Placing order…
                  </>
                ) : (
                  "Place order (COD) →"
                )}
              </button>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-28">
          <div className="rounded-2xl border border-[#E8E0D6] bg-white p-5 shadow-sm">
            <p className="font-display text-lg text-[#3D3835]">Order summary</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2 text-[#6B6560]">
                <dt>Subtotal</dt>
                <dd>{formatInrFromPaise(subtotalPaise)}</dd>
              </div>
              <div className="flex justify-between gap-2 text-[#6B6560]">
                <dt>Delivery</dt>
                <dd>
                  {freeShip && quotedDeliveryPaise > 0 ? (
                    <span>
                      <span className="line-through opacity-60">{formatInrFromPaise(quotedDeliveryPaise)}</span>{" "}
                      <span className="font-medium text-emerald-800">FREE</span>
                    </span>
                  ) : (
                    formatInrFromPaise(deliveryPaise)
                  )}
                </dd>
              </div>
              {couponValid ? (
                <div className="flex justify-between gap-2 text-emerald-800">
                  <dt>Coupon ({couponCode})</dt>
                  <dd>−{formatInrFromPaise(couponDiscountPaise)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-[#E8E0D6] pt-2 font-display text-lg text-[#3D3835]">
                <dt>Total</dt>
                <dd>{formatInrFromPaise(grandTotalPaise)}</dd>
              </div>
            </dl>
            {!freeShip && subtotalPaise > 0 ? (
              <p className="mt-3 text-xs text-[#6B6560]">
                Add{" "}
                {formatInrFromPaise(Math.max(0, freeShippingMinPaise() - subtotalPaise))} more for free shipping (min
                ₹{freeShippingMinRupeesWhole().toLocaleString("en-IN")}).
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
