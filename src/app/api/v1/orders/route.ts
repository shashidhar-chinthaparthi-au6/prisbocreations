import { z, ZodError } from "zod";
import { connectDb } from "@/lib/db";
import { getOptionalAuth, requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { createOrderFromCart, listOrdersForUser } from "@/lib/services/orderService";

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
  paymentMethod: z.enum(["online", "cod"]).optional().default("online"),
  shiprocketCourierId: emptyToUndefined(z.coerce.number().int().positive().optional()),
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

export async function POST(req: Request) {
  try {
    await connectDb();
    const body = createSchema.parse(await req.json());
    const session = await getOptionalAuth();
    if (session) {
      const order = await createOrderFromCart({
        userId: session.sub,
        lines: body.lines,
        shipping: body.shipping,
        paymentMethod: body.paymentMethod,
        shiprocketCourierId: body.shiprocketCourierId,
      });
      return jsonOk(order);
    }
    if (!body.guestEmail?.trim()) {
      return jsonError("Email is required for guest checkout", 400);
    }
    const order = await createOrderFromCart({
      guestEmail: body.guestEmail,
      lines: body.lines,
      shipping: body.shipping,
      paymentMethod: body.paymentMethod,
      shiprocketCourierId: body.shiprocketCourierId,
    });
    return jsonOk(order);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(zodMessage(e), 400, { issues: e.flatten() });
    }
    const msg = e instanceof Error ? e.message : "Order failed";
    return jsonError(msg, 400);
  }
}
