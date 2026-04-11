import { z } from "zod";
import { connectDb } from "@/lib/db";
import { getOptionalAuth, requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { createOrderFromCart, listOrdersForUser } from "@/lib/services/orderService";

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  optionKey: z.string().min(1).optional(),
  colorKey: z.string().min(1).max(64).optional(),
  customerImageUrl: z.string().url().max(2000).optional(),
  customerNotes: z.string().max(2000).optional(),
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
  guestEmail: z.string().email().optional(),
  paymentMethod: z.enum(["online", "cod"]).optional().default("online"),
});

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
    });
    return jsonOk(order);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError("Invalid input", 400, { issues: e.flatten() });
    }
    const msg = e instanceof Error ? e.message : "Order failed";
    return jsonError(msg, 400);
  }
}
