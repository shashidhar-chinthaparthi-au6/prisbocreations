import type mongoose from "mongoose";
import { User } from "@/lib/models/User";
import { appBaseUrl } from "@/lib/notify/config";
import type { OrderNotifyPayload } from "@/lib/notify/types";

type OrderItem = {
  name: string;
  quantity: number;
  unitPricePaise?: number;
  imageUrl?: string;
  optionLabel?: string;
  colorLabel?: string;
};

type Shipping = {
  fullName: string;
  phone: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export function mapItemsForEmail(order: OrderNotifyPayload & { items?: OrderItem[] }) {
  const base = appBaseUrl();
  const fallbackImg = `${base}/favicon.ico`;
  return (order.items ?? []).map((it) => {
    const unitPricePaise = it.unitPricePaise ?? 0;
    const variant = [it.colorLabel, it.optionLabel].filter(Boolean).join(" · ") || "—";
    return {
      name: it.name,
      variant,
      size: null as string | null,
      quantity: it.quantity,
      unitPrice: unitPricePaise / 100,
      imageUrl: it.imageUrl?.trim() || fallbackImg,
    };
  });
}

export function firstNameFromShipping(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? "there";
}

export function shippingAddressForTemplates(shipping: Shipping) {
  return {
    fullName: shipping.fullName,
    phone: shipping.phone,
    line1: shipping.line1 ?? "—",
    line2: shipping.line2,
    city: shipping.city ?? "—",
    state: shipping.state ?? "—",
    pincode: shipping.postalCode ?? "—",
  };
}

export function publicTrackUrl(orderNumber: string): string {
  const base = appBaseUrl();
  return `${base}/track?order=${encodeURIComponent(orderNumber)}`;
}

export function orderIdTrackUrl(orderId: string, email?: string | null): string {
  const base = appBaseUrl();
  const id = String(orderId);
  if (email) {
    return `${base}/orders/${id}?email=${encodeURIComponent(email)}`;
  }
  return `${base}/orders/${id}`;
}

export async function buildNotifyPayloadFromOrder(order: OrderNotifyPayload & Record<string, unknown>) {
  let email: string | undefined;
  if (order.guestEmail?.trim()) email = order.guestEmail.trim().toLowerCase();
  else if (order.userId) {
    const u = await User.findById(order.userId).select("email").lean();
    email = u?.email ? String(u.email).toLowerCase() : undefined;
  }
  const ctx = buildOrderNotifyContext(order);
  const trackUrl = orderIdTrackUrl(ctx.orderId, email ?? order.guestEmail ?? undefined);
  return {
    userId: ctx.userId?.toString(),
    orderId: ctx.orderId,
    firstName: ctx.firstName,
    email,
    phone: ctx.phone,
    customerName: ctx.customerName,
    orderNumber: ctx.orderNumber,
    items: ctx.items,
    subtotal: ctx.subtotal,
    shippingCharge: ctx.shippingCharge,
    discount: ctx.discount,
    total: ctx.total,
    paymentMethod: ctx.paymentMethod,
    shippingAddress: ctx.shippingAddress,
    estimatedDelivery: ctx.estimatedDelivery,
    awbCode: ctx.awbCode,
    trackingUrl: ctx.trackingUrl || trackUrl,
    trackUrl,
    paymentMethodRaw: order.paymentMethod,
  };
}

export function buildOrderNotifyContext(order: OrderNotifyPayload & Record<string, unknown>) {
  const id = String(order._id);
  const inv = order.invoiceNumber ?? id;
  const shipping = order.shipping as Shipping;
  const estimated =
    typeof order.estimatedDelivery === "string" && order.estimatedDelivery.trim()
      ? order.estimatedDelivery.trim()
      : "We'll share an ETA soon";
  return {
    orderId: id,
    orderNumber: inv,
    firstName: firstNameFromShipping(shipping.fullName),
    phone: shipping.phone,
    customerName: shipping.fullName,
    shippingAddress: shippingAddressForTemplates(shipping),
    items: mapItemsForEmail(order),
    subtotal: Number(order.subtotalPaise ?? 0) / 100,
    shippingCharge: Number(order.shippingPaise ?? 0) / 100,
    discount: Number(order.discountPaise ?? 0) / 100,
    total: Number(order.totalPaise ?? 0) / 100,
    paymentMethod: order.paymentMethod === "cod" ? "COD" : "Online",
    estimatedDelivery: estimated,
    awbCode: (order.shiprocket as { awb?: string } | undefined)?.awb?.trim() ?? "",
    trackingUrl:
      (order.shiprocket as { trackingUrl?: string } | undefined)?.trackingUrl?.trim() ?? "",
    userId: order.userId as mongoose.Types.ObjectId | null | undefined,
  };
}
