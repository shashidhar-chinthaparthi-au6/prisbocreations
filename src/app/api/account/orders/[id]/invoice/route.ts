import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonError } from "@/lib/api/response";
import { getOrderForUser } from "@/lib/services/orderService";
import { getSellerAddress } from "@/lib/seller-address";
import { renderOrderInvoicePdf } from "@/lib/pdf/order-invoice-pdf";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  await connectDb();
  const { id } = await ctx.params;
  const order = await getOrderForUser(id, auth.session.sub);
  if (!order) return jsonError("Order not found", 404);

  const inv = (order as { invoiceNumber?: string }).invoiceNumber ?? String(order._id);
  const shippingPaise = (order as { shippingPaise?: number }).shippingPaise ?? 0;
  const discountPaise = (order as { discountPaise?: number }).discountPaise ?? 0;
  const pm = (order as { paymentMethod?: string }).paymentMethod ?? "online";
  const created = order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "—";
  const seller = getSellerAddress();
  const gstin = process.env.SELLER_GSTIN?.trim() || process.env.NEXT_PUBLIC_SELLER_GSTIN?.trim();

  const buf = await renderOrderInvoicePdf({
    invoiceNumber: inv,
    orderId: String(order._id),
    createdLabel: created,
    seller: {
      legalName: seller.legalName,
      line1: seller.line1,
      line2: seller.line2,
      city: seller.city,
      state: seller.state,
      postalCode: seller.postalCode,
      country: seller.country,
      phone: seller.phone,
    },
    ...(gstin ? { gstin } : {}),
    billTo: {
      fullName: order.shipping.fullName,
      line1: order.shipping.line1,
      line2: order.shipping.line2?.trim() || undefined,
      city: order.shipping.city,
      state: order.shipping.state,
      postalCode: order.shipping.postalCode,
      country: order.shipping.country,
      phone: order.shipping.phone,
    },
    paymentLabel: pm === "cod" ? "Cash on delivery" : "Paid online",
    status: order.status,
    items: order.items.map((it) => {
      const line = it as typeof it & { giftWrapPaise?: number; giftMessage?: string };
      return {
        name: line.name,
        quantity: line.quantity,
        unitPricePaise: line.unitPricePaise,
        ...(typeof line.giftWrapPaise === "number" ? { giftWrapPaise: line.giftWrapPaise } : {}),
        ...(line.giftMessage?.trim() ? { giftMessage: line.giftMessage } : {}),
      };
    }),
    subtotalPaise: order.subtotalPaise,
    shippingPaise,
    discountPaise,
    totalPaise: order.totalPaise,
  });

  const filename = `${inv.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
  return new Response(Buffer.from(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
