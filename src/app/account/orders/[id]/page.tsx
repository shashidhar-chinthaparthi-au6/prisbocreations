import { redirect, notFound } from "next/navigation";
import { getStoreSession } from "@/lib/auth/store-session";
import { connectDb } from "@/lib/db";
import { getOrderForUser } from "@/lib/services/orderService";
import { AccountOrderDetailClient } from "@/app/account/orders/AccountOrderDetailClient";

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

  return (
    <AccountOrderDetailClient orderId={String(order._id)} initialReorderItems={reorderItems} />
  );
}
