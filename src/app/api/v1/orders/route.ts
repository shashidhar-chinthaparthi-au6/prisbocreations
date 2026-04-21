import { z, ZodError } from "zod";
import { connectDb } from "@/lib/db";
import { getOptionalAuth, requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import {
  createOrderFromCart,
  listOrdersForUser,
  OrderStockConflictError,
} from "@/lib/services/orderService";
import { estimateZone } from "@/lib/data/pincode-zones";

/** Treat "", null as undefined so optional .min(1) fields do not fail on empty string. */
function emptyToUndefined<V>(schema: z.ZodType<V>) {
  return z.preprocess((val) => (val === "" || val === null ? undefined : val), schema);
}

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  optionKey: emptyToUndefined(z.string().min(1).optional()),
  colorKey: emptyToUndefined(z.string().min(1).max(64).optional()),
  /** URL checked again in orderService (trusted host); avoid z.url() rejecting valid S3/edge cases */
  customerImageUrl: emptyToUndefined(z.string().max(2000).optional()),
  customerNotes: emptyToUndefined(z.string().max(2000).optional()),
  giftWrap: z.boolean().optional(),
  giftMessage: emptyToUndefined(z.string().max(500).optional()),
  customizationData: z.record(z.union([z.string(), z.array(z.string()), z.boolean()])).optional(),
  customizationFiles: z.record(z.unknown()).optional(),
});

const shipSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(5),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(3),
  country: z.string().min(2),
});

const createSchema = z.object({
  lines: z.array(lineSchema).min(1),
  shipping: shipSchema,
  guestEmail: emptyToUndefined(z.string().trim().email().optional()),
  guestPhone: emptyToUndefined(z.string().trim().min(10).max(15).optional()),
  paymentMethod: z.enum(["online", "cod"]).optional().default("online"),
  shiprocketCourierId: emptyToUndefined(z.coerce.number().int().positive().optional()),
  couponCode: emptyToUndefined(z.string().min(1).max(40).optional()),
  notes: emptyToUndefined(z.string().max(2000).optional()),
});

function zodMessage(err: ZodError): string {
  const flat = err.flatten();
  const parts: string[] = [];
  for (const [key, msgs] of Object.entries(flat.fieldErrors)) {
    if (msgs?.length) parts.push(`${key}: ${msgs.join(", ")}`);
  }
  if (flat.formErrors.length) parts.push(...flat.formErrors);
  return parts.length ? parts.join("; ") : "Invalid input";
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  await connectDb();
  const orders = await listOrdersForUser(auth.session.sub);
  return jsonOk(orders);
}

function serializeOrder(order: Record<string, unknown>) {
  const id = String(order._id);
  const inv = typeof order.invoiceNumber === "string" ? order.invoiceNumber : id;
  return {
    ...order,
    _id: id,
    orderId: id,
    orderNumber: inv,
  };
}

export async function POST(req: Request) {
  try {
    await connectDb();
    const body = createSchema.parse(await req.json());
    const idempotencyKey = req.headers.get("x-idempotency-key")?.trim() ?? undefined;
    const session = await getOptionalAuth();
    const pin = body.shipping.postalCode.replace(/\D/g, "").slice(0, 6);
    const zone = pin.length === 6 ? estimateZone(pin) : { days: "5-7", isCODAvailable: true };

    const payload = {
      lines: body.lines,
      shipping: body.shipping,
      paymentMethod: body.paymentMethod,
      shiprocketCourierId: body.shiprocketCourierId,
      couponCode: body.couponCode,
      notes: body.notes,
      idempotencyKey,
    };

    if (session) {
      const order = await createOrderFromCart({
        ...payload,
        userId: session.sub,
      });
      const plain =
        order &&
        typeof order === "object" &&
        "toObject" in order &&
        typeof (order as { toObject?: () => object }).toObject === "function"
          ? (order as { toObject: () => object }).toObject()
          : order;
      return jsonOk({
        ...serializeOrder({ ...(plain as Record<string, unknown>) }),
        estimatedDelivery: zone.days,
        codAvailable: zone.isCODAvailable,
      });
    }
    if (!body.guestEmail?.trim()) {
      return jsonError("Email is required for guest checkout", 400);
    }
    const order = await createOrderFromCart({
      ...payload,
      guestEmail: body.guestEmail,
      guestPhone: body.guestPhone,
    });
    const plain =
      order &&
      typeof order === "object" &&
      "toObject" in order &&
      typeof (order as { toObject?: () => object }).toObject === "function"
        ? (order as { toObject: () => object }).toObject()
        : order;
    return jsonOk({
      ...serializeOrder({ ...(plain as Record<string, unknown>) }),
      estimatedDelivery: zone.days,
      codAvailable: zone.isCODAvailable,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(zodMessage(e), 400, { issues: e.flatten() });
    }
    if (e instanceof OrderStockConflictError) {
      return jsonError(e.message, 409, { conflictItems: e.conflictItems });
    }
    const msg = e instanceof Error ? e.message : "Order failed";
    return jsonError(msg, 400);
  }
}
