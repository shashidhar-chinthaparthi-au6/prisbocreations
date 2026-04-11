import mongoose from "mongoose";
import { Order } from "@/lib/models/Order";
import { Product } from "@/lib/models/Product";
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
