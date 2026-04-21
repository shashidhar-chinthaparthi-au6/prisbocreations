import mongoose from "mongoose";
import { Order } from "@/lib/models/Order";
import { Product } from "@/lib/models/Product";
import { User } from "@/lib/models/User";
import { calcWeight } from "@/lib/shiprocket";
import { isShiprocketConfigured } from "@/lib/shiprocket-config";
import { checkServiceability } from "@/lib/serviceability";
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
import { notifyLowStockForProductIds } from "@/lib/notify/low-stock";
import { isTrustedCustomerImageUrl } from "@/lib/customer-upload";
import { GIFT_WRAP_PAISE } from "@/lib/gift-wrap";
import { qualifiesForFreeShipping } from "@/lib/free-shipping";
import { resolveProductLine } from "@/lib/product-options";
import { colorVariantsFromDoc } from "@/lib/product-color-variants";
import { incrementCouponUseCount, validateCouponCode } from "@/lib/services/couponService";
import {
  validateSchemaLineCustomization,
  type LineCustomizationPayload,
} from "@/lib/customization-order-validate";
import type { CustomizationDataMap, CustomizationFilesMap } from "@/lib/customization-types";

/** Thrown when cart lines cannot be fulfilled; API maps to HTTP 409. */
export class OrderStockConflictError extends Error {
  constructor(
    readonly conflictItems: Array<{ productId: string; name: string; message: string }>,
  ) {
    super("Some items in your cart need to be updated");
    this.name = "OrderStockConflictError";
  }
}

/** Server-side cart line from checkout API (optionKey when product has purchase options). */
export type OrderCartLineInput = {
  productId: string;
  quantity: number;
  optionKey?: string;
  colorKey?: string;
  customerImageUrl?: string;
  customerNotes?: string;
  giftWrap?: boolean;
  giftMessage?: string;
  customizationData?: CustomizationDataMap;
  /** Parsed in `validateSchemaLineCustomization` */
  customizationFiles?: unknown;
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

async function allocatePbOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const countYear = await Order.countDocuments({ createdAt: { $gte: start, $lt: end } });
  for (let i = 0; i < 32; i++) {
    const seq = countYear + i + 1;
    const invoiceNumber = `PB-${year}-${String(seq).padStart(5, "0")}`;
    const clash = await Order.exists({ invoiceNumber });
    if (!clash) return invoiceNumber;
  }
  throw new Error("Could not allocate order number");
}

async function resolveShippingForOrder(input: {
  items: Array<{ quantity: number }>;
  shipping: ShippingInput;
  paymentMethod: "online" | "cod";
  subtotalPaise: number;
}): Promise<{
  shippingPaise: number;
  actualShippingCostPaise?: number;
  selectedCourierId?: number;
  selectedCourierName?: string;
  estimatedDelivery?: string;
}> {
  const pin = input.shipping.postalCode.replace(/\D/g, "").slice(0, 6);
  if (pin.length !== 6) {
    throw new Error("Enter a valid 6-digit postal code.");
  }
  const weight = calcWeight(input.items.map((it) => ({ quantity: it.quantity })));
  const subtotalRupees = input.subtotalPaise / 100;
  const isCOD = input.paymentMethod === "cod";

  if (!isShiprocketConfigured()) {
    return { shippingPaise: 0 };
  }

  try {
    const svc = await checkServiceability(pin, weight, subtotalRupees, isCOD);
    if (!svc.serviceable) {
      throw new Error("Delivery not available for this pincode");
    }
    const shippingPaise = Math.round((svc.customerShippingCharge ?? 0) * 100);
    return {
      shippingPaise: Math.max(0, shippingPaise),
      actualShippingCostPaise:
        svc._actualCost != null ? Math.round(svc._actualCost * 100) : undefined,
      selectedCourierId: svc._selectedCourierId,
      selectedCourierName: svc._selectedCourierName,
      ...(svc.estimatedDate?.trim() ? { estimatedDelivery: svc.estimatedDate.trim() } : {}),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Delivery not available")) {
      throw e;
    }
    console.error("[orderService] Shiprocket serviceability", e);
    const th = Number(process.env.FREE_DELIVERY_THRESHOLD ?? 1499);
    const thPaise = Number.isFinite(th) && th > 0 ? Math.round(th * 100) : 149_900;
    const fallbackPaise = input.subtotalPaise >= thPaise ? 0 : 60 * 100;
    return { shippingPaise: fallbackPaise };
  }
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

function hasSchemaCustomization(p: Record<string, unknown>): boolean {
  const f = p.customizationFields;
  return Array.isArray(f) && f.length > 0;
}

function validateLineCustomization(
  p: Record<string, unknown>,
  line: OrderCartLineInput,
): {
  customerImageUrl?: string;
  customerNotes?: string;
  customizationData?: CustomizationDataMap;
  customizationFiles?: CustomizationFilesMap;
} {
  if (hasSchemaCustomization(p)) {
    const rawImg = line.customerImageUrl?.trim() ?? "";
    const rawNotes = (line.customerNotes ?? "").trim();
    if (rawImg || rawNotes) {
      throw new Error(`Use the personalisation form on the product page for ${String(p.name)}`);
    }
    const payload: LineCustomizationPayload = {
      customizationData: line.customizationData,
      customizationFiles: line.customizationFiles,
    };
    return validateSchemaLineCustomization(String(p.name), p.customizationFields, payload);
  }

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
  guestPhone?: string;
  lines: OrderCartLineInput[];
  shipping: ShippingInput;
  paymentMethod?: "online" | "cod";
  /** Shiprocket serviceability `courier_id` from checkout quote */
  shiprocketCourierId?: number;
  couponCode?: string;
  idempotencyKey?: string;
  notes?: string;
}) {
  if (!input.lines.length) throw new Error("Cart is empty");

  const hasUser = Boolean(input.userId);
  const guest = input.guestEmail?.trim();
  if (hasUser === Boolean(guest)) {
    throw new Error("Use a signed-in account or enter an email for guest checkout");
  }

  const idem = input.idempotencyKey?.trim();
  if (idem) {
    const existing = await Order.findOne({ idempotencyKey: idem }).lean();
    if (existing) {
      return existing;
    }
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
    giftWrapPaise?: number;
    giftMessage?: string;
    customizationData?: CustomizationDataMap;
    customizationFiles?: CustomizationFilesMap;
  }> = [];

  const conflicts: Array<{ productId: string; name: string; message: string }> = [];

  for (const line of input.lines) {
    const p = byId.get(line.productId);
    if (!p) {
      conflicts.push({
        productId: line.productId,
        name: "Product",
        message: "This product is no longer available",
      });
      continue;
    }
    if (line.quantity < 1) {
      conflicts.push({
        productId: line.productId,
        name: p.name,
        message: "Invalid quantity",
      });
      continue;
    }

    let resolved: ReturnType<typeof resolveProductLine>;
    try {
      resolved = resolveProductLine(p, line.optionKey ?? undefined);
    } catch (e) {
      conflicts.push({
        productId: line.productId,
        name: p.name,
        message: e instanceof Error ? e.message : "Invalid product options",
      });
      continue;
    }

    if (resolved.stock < line.quantity) {
      conflicts.push({
        productId: line.productId,
        name: p.name,
        message: `Only ${resolved.stock} left in stock`,
      });
      continue;
    }

    const colors = colorVariantsFromDoc(p);
    const colorKeyRaw = line.colorKey?.trim() ?? "";
    if (colors.length > 0) {
      if (!colorKeyRaw) {
        conflicts.push({
          productId: line.productId,
          name: p.name,
          message: "Choose a colour for this product",
        });
        continue;
      }
      const cv = colors.find((c) => c.key === colorKeyRaw);
      if (!cv) {
        conflicts.push({
          productId: line.productId,
          name: p.name,
          message: "Selected colour is no longer available",
        });
        continue;
      }
    } else if (colorKeyRaw) {
      conflicts.push({
        productId: line.productId,
        name: p.name,
        message: "Invalid product options",
      });
      continue;
    }

    const pRec = p as unknown as Record<string, unknown>;
    let cust: { customerImageUrl?: string; customerNotes?: string };
    try {
      cust = validateLineCustomization(pRec, line);
    } catch (e) {
      conflicts.push({
        productId: line.productId,
        name: p.name,
        message: e instanceof Error ? e.message : "Personalisation error",
      });
      continue;
    }

    const giftMsg = (line.giftMessage ?? "").trim();
    if (giftMsg.length > 500) {
      conflicts.push({
        productId: line.productId,
        name: p.name,
        message: "Gift message is too long",
      });
      continue;
    }
    const giftWrap = Boolean(line.giftWrap);
    const giftWrapPaise = giftWrap ? GIFT_WRAP_PAISE : 0;

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
    subtotalPaise += giftWrapPaise * line.quantity;
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
      ...(giftWrapPaise > 0 ? { giftWrapPaise } : {}),
      ...(giftMsg ? { giftMessage: giftMsg } : {}),
    });
  }

  if (conflicts.length) {
    throw new OrderStockConflictError(conflicts);
  }

  let discountPaise = 0;
  let appliedCoupon: string | undefined;
  const rawCoupon = input.couponCode?.trim();
  if (rawCoupon) {
    const v = await validateCouponCode(rawCoupon, subtotalPaise);
    if (!v.valid) {
      throw new Error(v.message);
    }
    discountPaise = v.discountPaise;
    appliedCoupon = rawCoupon.toUpperCase();
  }

  const paymentMethod = input.paymentMethod ?? "online";
  const status = paymentMethod === "cod" ? "processing" : "pending";

  const shipResolved = await resolveShippingForOrder({
    items: items.map((it) => ({ quantity: it.quantity })),
    shipping: input.shipping,
    paymentMethod,
    subtotalPaise,
  });
  let shippingPaise = shipResolved.shippingPaise;
  if (qualifiesForFreeShipping(subtotalPaise)) {
    shippingPaise = 0;
  }
  const totalPaise = Math.max(0, subtotalPaise + shippingPaise - discountPaise);
  const invoiceNumber = await allocatePbOrderNumber();

  const guestPhone = input.guestPhone?.replace(/\D/g, "").slice(0, 15);

  const order = await Order.create({
    ...(hasUser ? { userId: input.userId } : { guestEmail: normalizeGuestEmail(guest!) }),
    ...(!hasUser && guestPhone ? { guestPhone } : {}),
    invoiceNumber,
    items,
    subtotalPaise,
    shippingPaise,
    totalPaise,
    ...(appliedCoupon ? { couponCode: appliedCoupon, discountPaise } : {}),
    currency: "INR",
    status,
    paymentMethod,
    shipping: input.shipping,
    ...(input.notes?.trim() ? { notes: input.notes.trim().slice(0, 2000) } : {}),
    ...(idem ? { idempotencyKey: idem } : {}),
    ...(typeof shipResolved.selectedCourierId === "number" &&
    Number.isFinite(shipResolved.selectedCourierId) &&
    shipResolved.selectedCourierId > 0
      ? { shiprocketCourierId: shipResolved.selectedCourierId }
      : {}),
    ...(shipResolved.selectedCourierName?.trim()
      ? { selectedCourierName: shipResolved.selectedCourierName.trim() }
      : {}),
    ...(shipResolved.estimatedDelivery?.trim()
      ? { estimatedDelivery: shipResolved.estimatedDelivery.trim() }
      : {}),
    ...(shipResolved.actualShippingCostPaise != null && shipResolved.actualShippingCostPaise >= 0
      ? { actualShippingCostPaise: shipResolved.actualShippingCostPaise }
      : {}),
  });

  if (appliedCoupon) {
    void incrementCouponUseCount(appliedCoupon);
  }

  if (paymentMethod === "cod") {
    await decrementInventoryForOrderItems(items);
    /** Must await: on serverless, a fire-and-forget task is often cut off when the HTTP response ends. */
    await syncShiprocketForOrder(order._id.toString());
    void notifyLowStockForProductIds(items.map((it) => it.productId.toString())).catch(() => {});
  }

  const plain = typeof (order as { toObject?: () => object }).toObject === "function"
    ? (order as { toObject: () => object }).toObject()
    : order;
  void notifyOrderPlaced(plain as OrderNotifyPayload).catch(() => {});

  return order;
}

export async function listOrdersForUser(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return [];
  const uid = new mongoose.Types.ObjectId(userId);
  return Order.find({ userId: uid }).sort({ createdAt: -1 }).lean();
}

function isOidString(s: string): boolean {
  return mongoose.Types.ObjectId.isValid(s) && String(new mongoose.Types.ObjectId(s)) === s;
}

export async function getOrderForUser(orderIdOrInvoice: string, userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  if (isOidString(orderIdOrInvoice)) {
    return Order.findOne({ _id: orderIdOrInvoice, userId: uid }).lean();
  }
  const inv = orderIdOrInvoice.toUpperCase().replace(/\s+/g, "");
  return Order.findOne({ invoiceNumber: inv, userId: uid }).lean();
}

export async function getOrderForGuest(orderIdOrInvoice: string, guestEmail: string) {
  const normalized = normalizeGuestEmail(guestEmail);
  const guestQ = {
    guestEmail: normalized,
    $or: [{ userId: { $exists: false } }, { userId: null }],
  };
  if (isOidString(orderIdOrInvoice)) {
    return Order.findOne({ _id: orderIdOrInvoice, ...guestQ }).lean();
  }
  const inv = orderIdOrInvoice.toUpperCase().replace(/\s+/g, "");
  return Order.findOne({ invoiceNumber: inv, ...guestQ }).lean();
}

export async function listOrdersAdmin() {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(200).lean();
  const userIds = [
    ...new Set(
      orders
        .map((o) => o.userId)
        .filter((id): id is mongoose.Types.ObjectId => Boolean(id))
        .map((id) => id.toString()),
    ),
  ];
  const users =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } }).select("email").lean()
      : [];
  const emailByUserId = new Map(users.map((u) => [String(u._id), String(u.email ?? "")]));

  return orders.map((o) => {
    const customerEmail =
      o.guestEmail?.trim() ||
      (o.userId ? emailByUserId.get(String(o.userId)) : undefined) ||
      undefined;
    return { ...o, customerEmail };
  });
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
