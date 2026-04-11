import mongoose from "mongoose";
import { Order } from "@/lib/models/Order";
import { Product } from "@/lib/models/Product";
import { resolveProductLine } from "@/lib/product-options";

/** Server-side cart line from checkout API (optionKey when product has purchase options). */
export type OrderCartLineInput = {
  productId: string;
  quantity: number;
  optionKey?: string;
};

export type ShippingInput = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

function normalizeGuestEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function decrementInventoryForOrderItems(
  items: Array<{
    productId: mongoose.Types.ObjectId;
    quantity: number;
    optionKey?: string | null;
  }>,
) {
  for (const item of items) {
    const pid = item.productId.toString();
    const optKey = item.optionKey?.trim();
    if (optKey) {
      await Product.findByIdAndUpdate(
        pid,
        { $inc: { "options.$[o].stock": -item.quantity } },
        { arrayFilters: [{ "o.key": optKey }] },
      );
    } else {
      await Product.findByIdAndUpdate(pid, { $inc: { stock: -item.quantity } });
    }
  }
}

export async function createOrderFromCart(input: {
  userId?: string;
  guestEmail?: string;
  lines: OrderCartLineInput[];
  shipping: ShippingInput;
  paymentMethod?: "online" | "cod";
}) {
  if (!input.lines.length) throw new Error("Cart is empty");

  const hasUser = Boolean(input.userId);
  const guest = input.guestEmail?.trim();
  if (hasUser === Boolean(guest)) {
    throw new Error("Use a signed-in account or enter an email for guest checkout");
  }

  const ids = input.lines.map((l) => l.productId);
  const products = await Product.find({
    _id: { $in: ids },
    isActive: true,
  }).lean();

  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  let subtotalPaise = 0;
  const items: Array<{
    productId: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    sku: string;
    unitPricePaise: number;
    quantity: number;
    imageUrl?: string;
    optionKey?: string;
    optionLabel?: string;
  }> = [];

  for (const line of input.lines) {
    const p = byId.get(line.productId);
    if (!p) throw new Error("Invalid product in cart");
    if (line.quantity < 1) throw new Error("Invalid quantity");

    const resolved = resolveProductLine(p, line.optionKey ?? undefined);
    if (resolved.stock < line.quantity) {
      throw new Error(`Insufficient stock for ${p.name}`);
    }

    subtotalPaise += resolved.unitPricePaise * line.quantity;
    items.push({
      productId: p._id,
      name: resolved.optionLabel ? `${p.name} — ${resolved.optionLabel}` : p.name,
      slug: p.slug,
      sku: resolved.sku,
      unitPricePaise: resolved.unitPricePaise,
      quantity: line.quantity,
      imageUrl: p.images?.[0],
      optionKey: resolved.optionKey,
      optionLabel: resolved.optionLabel,
    });
  }

  const paymentMethod = input.paymentMethod ?? "online";
  const status = paymentMethod === "cod" ? "processing" : "pending";

  const order = await Order.create({
    ...(hasUser ? { userId: input.userId } : { guestEmail: normalizeGuestEmail(guest!) }),
    items,
    subtotalPaise,
    totalPaise: subtotalPaise,
    currency: "INR",
    status,
    paymentMethod,
    shipping: input.shipping,
  });

  if (paymentMethod === "cod") {
    await decrementInventoryForOrderItems(items);
  }

  return order;
}

export async function listOrdersForUser(userId: string) {
  return Order.find({ userId }).sort({ createdAt: -1 }).lean();
}

export async function getOrderForUser(orderId: string, userId: string) {
  return Order.findOne({ _id: orderId, userId }).lean();
}

export async function getOrderForGuest(orderId: string, guestEmail: string) {
  const normalized = normalizeGuestEmail(guestEmail);
  return Order.findOne({
    _id: orderId,
    guestEmail: normalized,
    $or: [{ userId: { $exists: false } }, { userId: null }],
  }).lean();
}

export async function listOrdersAdmin() {
  return Order.find().sort({ createdAt: -1 }).limit(200).lean();
}

export async function getOrderById(orderId: string) {
  return Order.findById(orderId).lean();
}

export async function updateOrderStatus(
  orderId: string,
  status: "pending" | "paid" | "processing" | "shipped" | "cancelled",
) {
  return Order.findByIdAndUpdate(orderId, { status }, { new: true }).lean();
}

export async function attachRazorpayOrderId(orderId: string, razorpayOrderId: string) {
  return Order.findByIdAndUpdate(orderId, { razorpayOrderId }, { new: true }).lean();
}

export async function markOrderPaid(orderId: string) {
  return Order.findByIdAndUpdate(orderId, { status: "paid" }, { new: true }).lean();
}
