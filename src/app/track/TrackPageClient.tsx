"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api/fetch-client";
import type { TrackPayload } from "@/types/track-payload";
import { TrackingSearchForm } from "@/components/tracking/TrackingSearchForm";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { TrackingSkeletonLoader } from "@/components/tracking/TrackingSkeletonLoader";
import { OrderSummaryCard } from "@/components/tracking/OrderSummaryCard";
import { TrackByContactPanel } from "@/components/tracking/TrackByContactPanel";

const WA = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164?.replace(/\D/g, "") ?? "";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@prisbocreations.com";

export function TrackPageClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [useAltContact, setUseAltContact] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<TrackPayload | null>(null);
  const [autoTried, setAutoTried] = useState(false);

  const runTrack = useCallback(
    async (order: string, em: string) => {
      const qs = new URLSearchParams();
      qs.set("order", order.trim());
      qs.set("email", em.trim());
      const res = await apiFetch<TrackPayload & { redirectTo?: string }>(`/api/track?${qs.toString()}`);
      if (res && typeof res === "object" && "redirectTo" in res && typeof (res as { redirectTo: string }).redirectTo === "string") {
        router.replace((res as { redirectTo: string }).redirectTo);
        return null;
      }
      return res as TrackPayload;
    },
    [router],
  );

  const runTrackWithContact = useCallback(
    async (order: string, contact: string) => {
      const qs = new URLSearchParams();
      qs.set("order", order.trim());
      if (contact.includes("@")) qs.set("email", contact.trim());
      else qs.set("contact", contact.trim());
      const res = await fetch(`/api/track?${qs.toString()}`, { credentials: "include" });
      const json = (await res.json()) as { ok?: boolean; data?: TrackPayload & { redirectTo?: string }; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Could not load tracking");
      }
      const payload = json.data;
      if (payload && "redirectTo" in payload && typeof payload.redirectTo === "string") {
        router.replace(payload.redirectTo);
        return null;
      }
      return payload as TrackPayload;
    },
    [router],
  );

  useEffect(() => {
    const o = sp.get("order")?.trim() ?? "";
    if (o) setOrderNumber(o);
    if (o && session?.user?.email) setEmail(session.user.email);
  }, [sp, session?.user?.email]);

  useEffect(() => {
    if (autoTried || sessionStatus === "loading" || useAltContact) return;
    const o = sp.get("order")?.trim() ?? "";
    if (!o || !session?.user?.email) return;
    setAutoTried(true);
    setBusy(true);
    setErr(null);
    void (async () => {
      try {
        const qs = new URLSearchParams();
        qs.set("order", o);
        const res = await fetch(`/api/track?${qs.toString()}`, { credentials: "include" });
        const json = (await res.json()) as { ok?: boolean; data?: TrackPayload & { redirectTo?: string }; error?: string };
        if (!res.ok || !json.ok) {
          setErr(json.error ?? "Could not load order");
          setBusy(false);
          return;
        }
        const payload = json.data;
        if (payload && "redirectTo" in payload && typeof payload.redirectTo === "string") {
          router.replace(payload.redirectTo);
          return;
        }
        setData(payload as TrackPayload);
        setEmail(session.user?.email ?? "");
      } catch {
        setErr("Something went wrong");
      } finally {
        setBusy(false);
      }
    })();
  }, [sp, session, sessionStatus, autoTried, router, useAltContact]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setData(null);
    setBusy(true);
    try {
      const payload = await runTrack(orderNumber, email);
      if (payload) setData(payload);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Order not found");
    } finally {
      setBusy(false);
    }
  }

  async function onTrackFromContact(orderNum: string, contact: string) {
    setErr(null);
    setData(null);
    setBusy(true);
    setUseAltContact(false);
    setOrderNumber(orderNum);
    if (contact.includes("@")) setEmail(contact);
    try {
      const payload = await runTrackWithContact(orderNum, contact);
      if (payload) setData(payload);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not load order");
      setUseAltContact(true);
    } finally {
      setBusy(false);
    }
  }

  function searchAgain() {
    setData(null);
    setErr(null);
    setUseAltContact(false);
  }

  const showForm = !data && !busy && !err;

  return (
    <div className="mx-auto max-w-[640px] px-4 py-10">
      {!data && !err ? (
        <>
          <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">Track your order</h1>
          <p className="mt-2 text-sm text-[#6B6560]">
            {useAltContact
              ? "Look up orders with the email or phone you used at checkout."
              : "Enter your order number and email to see the latest delivery status."}
          </p>
          <div className="mt-8">
            {busy ? <TrackingSkeletonLoader /> : null}
            {showForm && !useAltContact ? (
              <>
                <TrackingSearchForm
                  orderNumber={orderNumber}
                  email={email}
                  onOrderChange={setOrderNumber}
                  onEmailChange={setEmail}
                  onSubmit={onSubmit}
                  busy={busy}
                />
                <div className="mt-8 border-t border-[#E8E4DC] pt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUseAltContact(true);
                      setErr(null);
                    }}
                    className="text-sm font-medium text-[#C47A2B] hover:underline"
                  >
                    Don&apos;t have your order number?
                  </button>
                </div>
              </>
            ) : null}
            {showForm && useAltContact ? (
              <TrackByContactPanel
                onTrackOrder={onTrackFromContact}
                onBackToOrderNumber={() => {
                  setUseAltContact(false);
                  setErr(null);
                }}
              />
            ) : null}
          </div>
          {!useAltContact ? (
            <div className="mt-10 flex flex-col items-center gap-3 border-t border-[#E8E4DC] pt-8 text-center text-sm text-[#6B6560]">
              <p>Have an account?</p>
              <Link
                href="/login?redirect=/account/orders"
                className="inline-flex rounded-full border border-[#C47A2B] px-4 py-2 font-medium text-[#C47A2B] hover:bg-[#F5E6D0]"
              >
                Sign in for full order history
              </Link>
            </div>
          ) : null}
        </>
      ) : null}

      {err ? (
        <div className="rounded-2xl border border-[#FED7AA] bg-white px-5 py-6 shadow-sm">
          <p className="text-lg font-semibold text-[#9A3412]">Order not found</p>
          <p className="mt-2 text-sm text-[#6B6560]">
            We couldn&apos;t find an order with that number and email combination. Please check:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#1A1A1A]">
            <li>Order number: PB-YYYY-NNNNN (from your email)</li>
            <li>Email: the one you used when placing the order</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setErr(null)}
              className="rounded-full bg-[#C47A2B] px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
            <Link href="/pages/contact" className="rounded-full border border-[#D3D1C7] px-4 py-2 text-sm font-medium">
              Contact us
            </Link>
          </div>
        </div>
      ) : null}

      {data ? (
        <div className="space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-semibold text-[#1A1A1A]">
                Order #{data.orderNumber || "—"}
              </h1>
              <p className="mt-1 text-sm text-[#6B6560]">
                Placed{" "}
                {new Date(data.placedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={searchAgain}
              className="text-sm font-medium text-[#C47A2B] hover:underline"
            >
              Search again
            </button>
          </div>

          {data.lastFetchAttemptFailed ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
              Carrier data may be delayed. Showing the last saved updates (~{data.cacheAgeHours}h ago).
            </p>
          ) : data.cacheAgeHours >= 2 ? (
            <p className="text-xs text-[#6B6560]">Last updated {Math.round(data.cacheAgeHours)} hours ago.</p>
          ) : null}

          <OrderSummaryCard data={data} addressMode="public" />

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#6B6560]">Shipment progress</h2>
            <div className="mt-4">
              <TrackingTimeline
                currentStage={data.currentStage}
                events={data.events}
                estimatedDelivery={data.estimatedDelivery}
              />
            </div>
          </div>

          <div className="border-t border-[#E8E4DC] pt-6">
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Need help?</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {WA ? (
                <a
                  href={`https://wa.me/${WA}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#059669] bg-[#ECFDF5] px-4 py-2 text-sm font-medium text-[#065F46]"
                >
                  WhatsApp us
                </a>
              ) : null}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="rounded-full border border-[#D3D1C7] px-4 py-2 text-sm font-medium text-[#1A1A1A]"
              >
                Email support
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
