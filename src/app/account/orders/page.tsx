import Link from "next/link";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { getStoreSession } from "@/lib/auth/store-session";
import { connectDb } from "@/lib/db";
import { listOrdersForUser } from "@/lib/services/orderService";
import { AccountOrdersView, type AccountOrderRow } from "@/components/account/AccountOrdersView";
import { deriveCurrentStage } from "@/lib/trackingStatus";
import { Review } from "@/lib/models/Review";

export const metadata = { title: "Orders" };

export default async function AccountOrdersPage() {
  const session = await getStoreSession();
  if (!session) redirect("/login?redirect=/account/orders");

  await connectDb();
  const orders = await listOrdersForUser(session.sub);

  const rows: AccountOrderRow[] = orders.map((o) => {
    const sr = (o as { shiprocket?: { webhookScans?: { activity?: string; date?: string; location?: string }[] } })
      .shiprocket;
    const scans = sr?.webhookScans ?? [];
    const stage = deriveCurrentStage(
      o.status,
      scans.map((s) => ({ status: (s.activity ?? "").trim() || "—" })),
    );
    const items = o.items as Array<{
      productId: unknown;
      slug: string;
      name: string;
      unitPricePaise: number;
      imageUrl?: string;
      optionKey?: string;
      optionLabel?: string;
      colorKey?: string;
      colorLabel?: string;
      customerImageUrl?: string;
      customerNotes?: string;
      giftWrapPaise?: number;
      giftMessage?: string;
    }>;
    return {
      id: String(o._id),
      invoiceNumber: (o as { invoiceNumber?: string }).invoiceNumber,
      createdAt: (o.createdAt ? new Date(o.createdAt) : new Date()).toISOString(),
      status: o.status,
      paymentMethod: (o as { paymentMethod?: string }).paymentMethod,
      totalPaise: o.totalPaise,
      itemImages: items.map((it) => it.imageUrl ?? "").filter(Boolean),
      itemCount: items.length,
      scans,
      delivered: stage === "DELIVERED",
      reorderItems: items.map((it) => ({
        productId: String(it.productId),
        slug: it.slug,
        name: it.name,
        unitPricePaise: it.unitPricePaise,
        ...(it.imageUrl ? { imageUrl: it.imageUrl } : {}),
        ...(it.optionKey ? { optionKey: it.optionKey, optionLabel: it.optionLabel } : {}),
        ...(it.colorKey ? { colorKey: it.colorKey, colorLabel: it.colorLabel } : {}),
        ...(it.customerImageUrl?.trim() ? { customerImageUrl: it.customerImageUrl.trim() } : {}),
        ...(it.customerNotes?.trim() ? { customerNotes: it.customerNotes.trim() } : {}),
        ...(typeof it.giftWrapPaise === "number" && it.giftWrapPaise > 0
          ? { giftWrapPaise: it.giftWrapPaise }
          : {}),
        ...(it.giftMessage?.trim() ? { giftMessage: it.giftMessage } : {}),
      })),
    };
  });

  const uid = new mongoose.Types.ObjectId(session.sub);
  const productIds = [
    ...new Set(
      rows.filter((r) => r.delivered).flatMap((r) => r.reorderItems.map((it) => it.productId)),
    ),
  ]
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const reviewedDocs =
    productIds.length > 0
      ? await Review.find({ userId: uid, productId: { $in: productIds } })
          .select("productId")
          .lean()
      : [];
  const reviewedSet = new Set(reviewedDocs.map((d) => String(d.productId)));
  for (const row of rows) {
    if (!row.delivered) continue;
    row.reorderItems = row.reorderItems.map((it) => ({
      ...it,
      reviewed: reviewedSet.has(it.productId),
    }));
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-[var(--brand-ink)]">Your orders</h1>
      <AccountOrdersView orders={rows} />
      <p className="text-center text-sm text-[var(--brand-muted)] md:text-left">
        Looking for a guest checkout order?{" "}
        <Link href="/track" className="font-medium text-[var(--brand-amber)] hover:underline">
          Track with order number
        </Link>
      </p>
    </div>
  );
}
