import { randomBytes } from "crypto";
import mongoose from "mongoose";
import { Order } from "@/lib/models/Order";
import { Product } from "@/lib/models/Product";
import { User } from "@/lib/models/User";
import { getShiprocketConfig, isShiprocketConfigured } from "@/lib/shiprocket-config";
import { shiprocketServiceability } from "@/lib/services/shiprocketApi";
import {
  cancelShiprocketForOrder,
  syncShiprocketForOrder,
  type ShiprocketOrderLean,
} from "@/lib/services/shiprocketSync";
import {
  notifyOrderCancelled,
  notifyOrderPaid,
  notifyOrderPlaced,
  notifyOrderShipped,
  type OrderNotifyPayload,
} from "@/lib/notify/dispatch";
import { isTrustedCustomerImageUrl } from "@/lib/customer-upload";
import { resolveProductLine } from "@/lib/product-options";
import { colorVariantsFromDoc } from "@/lib/product-color-variants";

/** Server-side cart line from checkout API (optionKey when product has purchase options). */
export type OrderCartLineInput = {
  productId: string;
  quantity: number;
  optionKey?: string;
  colorKey?: string;
  customerImageUrl?: string;
  customerNotes?: string;
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

async function allocateInvoiceNumber(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = randomBytes(3).toString("hex").toUpperCase();
    const invoiceNumber = `PCB-${day}-${suffix}`;
    const clash = await Order.exists({ invoiceNumber });
    if (!clash) return invoiceNumber;
  }
  throw new Error("Could not allocate invoice number");
}

async function shippingPaiseForCheckout(input: {
  shiprocketCourierId?: number;
  shipping: ShippingInput;
  paymentMethod: "online" | "cod";
}): Promise<number> {
  if (!isShiprocketConfigured()) return 0;
  const id = input.shiprocketCourierId;
  if (typeof id !== "number" || !Number.isFinite(id) || id <= 0) return 0;
  const pin = input.shipping.postalCode.replace(/\D/g, "").slice(0, 6);
  if (pin.length !== 6) {
    throw new Error("Enter a valid 6-digit postal code when choosing a courier.");
  }
  const cfg = getShiprocketConfig();
  if (!cfg) return 0;
  const cod = input.paymentMethod === "cod";
  const quotes = await shiprocketServiceability({
    deliveryPostcode: pin,
    weightKg: cfg.defaultWeightKg,
    cod,
  });
  if (!quotes.length) {
    throw new Error(
      "Delivery quotes are unavailable right now. Try again in a moment or contact support.",
    );
  }
  const row = quotes.find((q) => q.courierId === id);
  if (!row) {
    throw new Error(
      "Selected delivery option is no longer available for this address. Go back to checkout and choose shipping again.",
    );
  }
  return Math.max(0, Math.round(row.totalCharge * 100));
}

function customizationFlags(p: Record<string, unknown>) {
  return {
    allow: Boolean(p.allowCustomerCustomization),
    imageRequired: p.customizationImageRequired !== false,
    textRequired: Boolean(p.customizationTextRequired),
    maxNotes:
      typeof p.customizationTextMaxLength === "number" &&
      Number.isFinite(p.customizationTextMaxLength)
        ? Math.min(2000, Math.max(1, p.customizationTextMaxLength))
        : 500,
  };
}

function validateLineCustomization(
  p: Record<string, unknown>,
  line: OrderCartLineInput,
): { customerImageUrl?: string; customerNotes?: string } {
  const flags = customizationFlags(p);
  const rawImg = line.customerImageUrl?.trim() ?? "";
  const rawNotes = (line.customerNotes ?? "").trim();

  if (!flags.allow) {
    if (rawImg || rawNotes) {
      throw new Error(`Personalisation is not enabled for ${String(p.name)}`);
    }
    return {};
  }

  if (rawNotes.length > flags.maxNotes) {
    throw new Error(
      `Notes are too long for ${String(p.name)} (max ${flags.maxNotes} characters)`,
    );
  }

  if (flags.imageRequired && !rawImg) {
    throw new Error(`Please upload a reference image for ${String(p.name)}`);
  }

  if (flags.textRequired && !rawNotes) {
    throw new Error(`Please enter text for ${String(p.name)}`);
  }

  if (!flags.imageRequired && !flags.textRequired && !rawImg && !rawNotes) {
    throw new Error(`Add an image or notes for ${String(p.name)}`);
  }

  if (rawImg && !isTrustedCustomerImageUrl(rawImg)) {
    throw new Error("Invalid or disallowed image URL");
  }

  return {
    customerImageUrl: rawImg || undefined,
    customerNotes: rawNotes || undefined,
  };
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
  /** Shiprocket serviceability `courier_id` from checkout quote */
  shiprocketCourierId?: number;
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
    colorKey?: string;
    colorLabel?: string;
    customerImageUrl?: string;
    customerNotes?: string;
  }> = [];

  for (const line of input.lines) {
    const p = byId.get(line.productId);
    if (!p) throw new Error("Invalid product in cart");
    if (line.quantity < 1) throw new Error("Invalid quantity");

    const resolved = resolveProductLine(p, line.optionKey ?? undefined);
    if (resolved.stock < line.quantity) {
      throw new Error(`Insufficient stock for ${p.name}`);
    }

    const colors = colorVariantsFromDoc(p);
    const colorKeyRaw = line.colorKey?.trim() ?? "";
    if (colors.length > 0) {
      if (!colorKeyRaw) throw new Error(`Choose a color for ${p.name}`);
      const cv = colors.find((c) => c.key === colorKeyRaw);
      if (!cv) throw new Error("Invalid color option");
    } else if (colorKeyRaw) {
      throw new Error("Invalid line");
    }

    const pRec = p as unknown as Record<string, unknown>;
    const cust = validateLineCustomization(pRec, line);

    const colorLabel =
      colorKeyRaw && colors.length
        ? colors.find((c) => c.key === colorKeyRaw)?.label
        : undefined;
    const titleParts: string[] = [];
    if (colorLabel) titleParts.push(colorLabel);
    if (resolved.optionLabel) titleParts.push(resolved.optionLabel);
    const displayName =
      titleParts.length > 0 ? `${p.name} — ${titleParts.join(" · ")}` : p.name;

    let imageUrl: string | undefined = p.images?.[0];
    if (colorKeyRaw && colors.length) {
      const cv = colors.find((c) => c.key === colorKeyRaw);
      if (cv?.images?.length) imageUrl = cv.images[0];
    }

    subtotalPaise += resolved.unitPricePaise * line.quantity;
    items.push({
      productId: p._id,
      name: displayName,
      slug: p.slug,
      sku: resolved.sku,
      unitPricePaise: resolved.unitPricePaise,
      quantity: line.quantity,
      imageUrl,
      optionKey: resolved.optionKey,
      optionLabel: resolved.optionLabel,
      ...(colorKeyRaw ? { colorKey: colorKeyRaw, colorLabel } : {}),
      ...cust,
    });
  }

  const paymentMethod = input.paymentMethod ?? "online";
  const status = paymentMethod === "cod" ? "processing" : "pending";

  const shippingPaise = await shippingPaiseForCheckout({
    shiprocketCourierId: input.shiprocketCourierId,
    shipping: input.shipping,
    paymentMethod,
  });
  const totalPaise = subtotalPaise + shippingPaise;
  const invoiceNumber = await allocateInvoiceNumber();

  const order = await Order.create({
    ...(hasUser ? { userId: input.userId } : { guestEmail: normalizeGuestEmail(guest!) }),
    invoiceNumber,
    items,
    subtotalPaise,
    shippingPaise,
    totalPaise,
    currency: "INR",
    status,
    paymentMethod,
    shipping: input.shipping,
    ...(typeof input.shiprocketCourierId === "number" &&
    Number.isFinite(input.shiprocketCourierId) &&
    input.shiprocketCourierId > 0
      ? { shiprocketCourierId: input.shiprocketCourierId }
      : {}),
  });

  if (paymentMethod === "cod") {
    await decrementInventoryForOrderItems(items);
    /** Must await: on serverless, a fire-and-forget task is often cut off when the HTTP response ends. */
    await syncShiprocketForOrder(order._id.toString());
  }

  const plain = typeof (order as { toObject?: () => object }).toObject === "function"
    ? (order as { toObject: () => object }).toObject()
    : order;
  void notifyOrderPlaced(plain as OrderNotifyPayload).catch(() => {});

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
  opts?: { cancelReason?: string },
) {
  const prev = await Order.findById(orderId).lean();
  if (!prev) return null;

  if (status === "cancelled" && prev.status !== "cancelled") {
    await cancelShiprocketForOrder(prev as ShiprocketOrderLean);
    const shouldRestoreStock = prev.status === "paid" || prev.status === "processing";
    if (shouldRestoreStock && prev.items?.length) {
      await incrementInventoryForOrderItems(
        prev.items.map((it) => ({
          productId: it.productId as mongoose.Types.ObjectId,
          quantity: it.quantity,
          optionKey: it.optionKey,
        })),
      );
    }
    const reason = (opts?.cancelReason?.trim() || "Cancelled by admin").slice(0, 2000);
    const cancelledDoc = await Order.findByIdAndUpdate(
      orderId,
      {
        status: "cancelled",
        cancelReason: reason,
        orderCancelledAt: new Date(),
      },
      { new: true },
    ).lean();
    if (cancelledDoc) {
      void notifyOrderCancelled(cancelledDoc as OrderNotifyPayload, reason).catch(() => {});
    }
    return cancelledDoc;
  }

  const updated = await Order.findByIdAndUpdate(orderId, { status }, { new: true }).lean();
  if (
    updated &&
    (status === "paid" || status === "processing" || status === "shipped")
  ) {
    await syncShiprocketForOrder(orderId);
  }
  if (updated && status === "shipped" && prev.status !== "shipped") {
    void notifyOrderShipped(updated as OrderNotifyPayload).catch(() => {});
  }
  return updated;
}

export async function attachRazorpayOrderId(orderId: string, razorpayOrderId: string) {
  return Order.findByIdAndUpdate(orderId, { razorpayOrderId }, { new: true }).lean();
}

export async function markOrderPaid(orderId: string) {
  const prev = await Order.findById(orderId).select("status").lean();
  const wasPending = prev?.status === "pending";
  const doc = await Order.findByIdAndUpdate(orderId, { status: "paid" }, { new: true }).lean();
  if (doc) {
    await syncShiprocketForOrder(orderId);
    if (wasPending) void notifyOrderPaid(doc as OrderNotifyPayload).catch(() => {});
  }
  return doc;
}

/** Restore stock when a paid / COD-placed order is cancelled before fulfilment. */
export async function incrementInventoryForOrderItems(
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
        { $inc: { "options.$[o].stock": item.quantity } },
        { arrayFilters: [{ "o.key": optKey }] },
      );
    } else {
      await Product.findByIdAndUpdate(pid, { $inc: { stock: item.quantity } });
    }
  }
}

export async function lookupOrderForTrack(identifier: string, email: string) {
  const raw = identifier.trim();
  const em = normalizeGuestEmail(email);
  if (!raw || !em) throw new Error("Order or invoice number and email are required.");

  let order;
  if (mongoose.Types.ObjectId.isValid(raw) && String(new mongoose.Types.ObjectId(raw)) === raw) {
    order = await Order.findById(raw).lean();
  } else {
    const inv = raw.toUpperCase().replace(/\s+/g, "");
    order = await Order.findOne({ invoiceNumber: inv }).lean();
  }
  if (!order) throw new Error("No order matches these details.");

  if (order.guestEmail) {
    if (normalizeGuestEmail(order.guestEmail) !== em) throw new Error("No order matches these details.");
    return order;
  }
  if (order.userId) {
    const u = await User.findById(order.userId).lean();
    if (!u || normalizeGuestEmail(u.email) !== em) throw new Error("No order matches these details.");
    return order;
  }
  throw new Error("No order matches these details.");
}

export async function cancelOrderByOwner(input: {
  orderId: string;
  userId?: string;
  guestEmail?: string;
  reason: string;
}) {
  const reason = input.reason.trim();
  if (reason.length < 3) {
    throw new Error("Please enter a cancellation reason (at least 3 characters).");
  }

  const order = await Order.findById(input.orderId).lean();
  if (!order) throw new Error("Order not found");

  if (order.userId) {
    if (!input.userId || order.userId.toString() !== input.userId) throw new Error("Order not found");
  } else {
    const ge = order.guestEmail;
    if (!ge || !input.guestEmail || normalizeGuestEmail(ge) !== normalizeGuestEmail(input.guestEmail)) {
      throw new Error("Order not found");
    }
  }

  if (order.status === "cancelled") throw new Error("This order is already cancelled.");
  if (order.status === "shipped") {
    throw new Error("This order has shipped and cannot be cancelled online. Please contact support.");
  }

  const shouldRestoreStock = order.status === "paid" || order.status === "processing";

  await cancelShiprocketForOrder(order as ShiprocketOrderLean);

  const updated = await Order.findByIdAndUpdate(
    input.orderId,
    {
      status: "cancelled",
      cancelReason: reason,
      orderCancelledAt: new Date(),
    },
    { new: true },
  ).lean();

  if (shouldRestoreStock && order.items?.length) {
    await incrementInventoryForOrderItems(
      order.items.map((it) => ({
        productId: it.productId as mongoose.Types.ObjectId,
        quantity: it.quantity,
        optionKey: it.optionKey,
      })),
    );
  }

  if (updated) {
    void notifyOrderCancelled(updated as OrderNotifyPayload, reason).catch(() => {});
  }

  return updated;
}
