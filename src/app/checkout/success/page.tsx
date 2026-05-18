import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreSession } from "@/lib/auth/store-session";
import { connectDb } from "@/lib/db";
import { getOrderForGuest, getOrderForUser } from "@/lib/services/orderService";
import { formatInrFromPaise } from "@/lib/format";
import { SuccessOrderClient } from "./SuccessOrderClient";
import { GuestRegisterNudge } from "@/components/checkout/success/GuestRegisterNudge";
import { addDays, format } from "date-fns";

export const metadata = { title: "Order confirmed" };

function parseOrderRef(sp: {
  order?: string;
  orderId?: string;
}): string | null {
  const o = sp.order?.trim() || sp.orderId?.trim();
  return o || null;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    order?: string;
    orderId?: string;
    email?: string;
    paid?: string;
    cod?: string;
  }>;
}) {
  const sp = await searchParams;
  const ref = parseOrderRef(sp);
  if (!ref) notFound();

  await connectDb();
  const session = await getStoreSession();
  const emailQ = sp.email?.trim().toLowerCase() ?? "";

  let order = session ? await getOrderForUser(ref, session.sub) : null;
  if (!order && emailQ) {
    order = await getOrderForGuest(ref, emailQ);
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="font-display text-2xl text-[#3D3835]">Thanks!</h1>
        <p className="text-[#6B6560]">
          We couldn&apos;t load order details. Check your email for confirmation or{" "}
          <Link href="/track" className="font-medium text-[#C47A2B] hover:underline">
            track your order
          </Link>
          .
        </p>
        <Link
          href="/products"
          className="inline-flex rounded-full bg-[#C47A2B] px-6 py-3 text-sm font-semibold text-white"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const inv = (order as { invoiceNumber?: string }).invoiceNumber ?? String(order._id);
  const ship = order.shipping;
  const isGuest = !order.userId;
  const rawItems = (order as { items?: unknown[] }).items ?? [];
  const hasCustomizationUploads = rawItems.some((it) => {
    if (!it || typeof it !== "object") return false;
    const rec = it as Record<string, unknown>;
    const cf = rec.customizationFiles;
    return (
      cf != null &&
      typeof cf === "object" &&
      !Array.isArray(cf) &&
      Object.keys(cf as Record<string, unknown>).length > 0
    );
  });
  const notifyEmail =
    emailQ ||
    (typeof (order as { guestEmail?: string }).guestEmail === "string" ?
      (order as { guestEmail: string }).guestEmail.trim().toLowerCase()
    : "");
  const placed = order.createdAt ? new Date(order.createdAt as Date) : new Date();
  const estDays = (order as { estimatedDelivery?: string }).estimatedDelivery ?? "3-5";
  const windowEnd = addDays(placed, 7);

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <SuccessOrderClient />
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5E6D0] text-3xl text-[#C47A2B]" aria-hidden>
          ✓
        </div>
        <h1 className="font-display text-2xl text-[#3D3835] sm:text-3xl">
          Thank you{ship?.fullName ? `, ${ship.fullName.split(" ")[0]}` : ""}!
        </h1>
        <p className="mt-2 text-[#6B6560]">Your order is confirmed.</p>
        <p className="mt-3 font-mono text-lg font-semibold text-[#3D3835]">{inv}</p>
        <p className="text-sm text-[#6B6560]">Placed on {format(placed, "d MMMM yyyy")}</p>
      </div>

      <div className="rounded-2xl border border-[#E8E0D6] bg-white p-6 text-left shadow-sm">
        <p className="text-sm text-[#6B6560]">We&apos;ve sent a confirmation to:</p>
        <p className="mt-1 font-medium text-[#3D3835]">{emailQ || "your registered email"}</p>

        <hr className="my-4 border-[#E8E0D6]" />

        <p className="text-sm font-medium text-[#3D3835]">Estimated delivery</p>
        <p className="text-[#6B6560]">{estDays} working days</p>
        <p className="text-sm text-[#6B6560]">By {format(addDays(placed, 5), "d MMMM yyyy")} – {format(windowEnd, "d MMMM yyyy")}</p>

        <hr className="my-4 border-[#E8E0D6]" />

        {hasCustomizationUploads ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            <p className="font-medium">Next step: Design proof</p>
            <p className="mt-1">
              We&apos;ll send you a digital proof of your design within 24 hours for approval before
              production starts. Check your email and WhatsApp at{" "}
              <span className="font-medium">
                {notifyEmail || "the email on your order"}
              </span>
              .
            </p>
          </div>
        ) : null}

        {hasCustomizationUploads ? <hr className="my-4 border-[#E8E0D6]" /> : null}

        <div className="flex justify-between text-sm">
          <span className="text-[#6B6560]">Total (COD)</span>
          <span className="font-semibold text-[#3D3835]">{formatInrFromPaise(order.totalPaise)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`/track?order=${encodeURIComponent(inv)}`}
          className="inline-flex justify-center rounded-full border border-[#E8E0D6] bg-white px-6 py-3 text-sm font-semibold text-[#3D3835]"
        >
          Track this order
        </Link>
        <Link
          href="/products"
          className="inline-flex justify-center rounded-full bg-[#C47A2B] px-6 py-3 text-sm font-semibold text-white"
        >
          Continue shopping
        </Link>
      </div>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(`I just ordered from Prisbo Creations! Order ${inv} is on its way.`)}`}
        className="block text-center text-sm font-medium text-[#C47A2B] hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Share on WhatsApp
      </a>

      {isGuest ? (
        <GuestRegisterNudge guestEmail={emailQ} shippingFullName={ship?.fullName} />
      ) : null}
    </div>
  );
}
