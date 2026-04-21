import { redirect, notFound } from "next/navigation";
import mongoose from "mongoose";
import { getStoreSession } from "@/lib/auth/store-session";
import { connectDb } from "@/lib/db";
import { getOrderForUser } from "@/lib/services/orderService";
import { AccountOrderDetailClient } from "@/app/account/orders/AccountOrderDetailClient";
import { Review } from "@/lib/models/Review";
import { orderIsDelivered } from "@/lib/order-delivered";

export const metadata = { title: "Order detail" };

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getStoreSession();
  if (!session) redirect("/login?redirect=/account/orders");

  const { id } = await params;
  await connectDb();
  const order = await getOrderForUser(id, session.sub);
  if (!order) notFound();

  const reorderItems = order.items.map((it) => {
    const line = it as typeof it & {
      imageUrl?: string;
      optionKey?: string;
      optionLabel?: string;
      colorKey?: string;
      colorLabel?: string;
      customerImageUrl?: string;
      customerNotes?: string;
      giftWrapPaise?: number;
      giftMessage?: string;
    };
    return {
      productId: String(line.productId),
      slug: line.slug,
      name: line.name,
      unitPricePaise: line.unitPricePaise,
      ...(line.imageUrl ? { imageUrl: line.imageUrl } : {}),
      ...(line.optionKey ? { optionKey: line.optionKey, optionLabel: line.optionLabel } : {}),
      ...(line.colorKey ? { colorKey: line.colorKey, colorLabel: line.colorLabel } : {}),
      ...(line.customerImageUrl?.trim() ? { customerImageUrl: line.customerImageUrl.trim() } : {}),
      ...(line.customerNotes?.trim() ? { customerNotes: line.customerNotes.trim() } : {}),
      ...(typeof line.giftWrapPaise === "number" && line.giftWrapPaise > 0
        ? { giftWrapPaise: line.giftWrapPaise }
        : {}),
      ...(line.giftMessage?.trim() ? { giftMessage: line.giftMessage } : {}),
    };
  });

  const delivered = orderIsDelivered(order);
  const uid = new mongoose.Types.ObjectId(session.sub);
  const itemPids = order.items.map((it) => it.productId);
  const reviewedDocs =
    delivered && itemPids.length > 0
      ? await Review.find({
          userId: uid,
          productId: { $in: itemPids },
        })
          .select("productId")
          .lean()
      : [];
  const reviewedSet = new Set(reviewedDocs.map((d) => String(d.productId)));
  const reviewLines = delivered
    ? order.items.map((it) => {
        const line = it as typeof it & { imageUrl?: string };
        return {
          productId: String(line.productId),
          slug: line.slug,
          name: line.name,
          ...(line.imageUrl ? { imageUrl: line.imageUrl } : {}),
          reviewed: reviewedSet.has(String(line.productId)),
        };
      })
    : [];
  const orderDateLabel = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <AccountOrderDetailClient
      orderId={String(order._id)}
      initialReorderItems={reorderItems}
      delivered={delivered}
      reviewLines={reviewLines}
      orderDateLabel={orderDateLabel}
    />
  );
}
