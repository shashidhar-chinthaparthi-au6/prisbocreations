import type { NextRequest } from "next/server";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { getOptionalAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import {
  buildTrackPayload,
  findOrderByInvoiceForUser,
  findOrderForPublicTrack,
  loadEventsWithOptionalRefresh,
  type TrackOrderLean,
} from "@/lib/services/trackingService";
import { findOrderDocumentByNumber, orderMatchesContact } from "@/lib/track-contact";

const querySchema = z.object({
  order: z.string().min(1).optional(),
  orderNumber: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  contact: z.string().min(3).max(200).optional().or(z.literal("")),
});

const postSchema = z.object({
  orderNumber: z.string().min(1),
  email: z.string().email(),
});

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await getOptionalAuth();
    const q = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = querySchema.safeParse(q);
    if (!parsed.success) {
      return jsonError("Enter order number and email", 400);
    }
    const orderParam = (parsed.data.order ?? parsed.data.orderNumber ?? "").trim();
    let emailEff = (parsed.data.email ?? "").trim();
    let contactEff = (parsed.data.contact ?? "").trim();

    if (session?.sub && orderParam && !emailEff && !contactEff) {
      const owned = await findOrderByInvoiceForUser(orderParam, session.sub);
      if (owned?._id) {
        return jsonOk({ redirectTo: `/account/orders/${String(owned._id)}` });
      }
      const sessionEmail = session.email?.trim().toLowerCase() ?? "";
      if (sessionEmail) emailEff = sessionEmail;
    }

    if (!orderParam || (!emailEff && !contactEff)) {
      return jsonError("Enter order number and email or contact", 400);
    }

    let order: TrackOrderLean | null = null;
    if (emailEff) {
      order = await findOrderForPublicTrack(orderParam, emailEff);
    } else {
      const doc = await findOrderDocumentByNumber(orderParam);
      if (doc && (await orderMatchesContact(doc, contactEff))) {
        order = doc as unknown as TrackOrderLean;
      }
    }
    if (!order) {
      return jsonError("Order not found. Check your order number and email.", 404);
    }

    const awb = order.shiprocket?.awb;
    const { events, refreshFailed } = await loadEventsWithOptionalRefresh(String(order._id), awb);
    const payload = buildTrackPayload({
      order,
      events,
      mode: "public",
      lastFetchAttemptFailed: refreshFailed,
    });
    return jsonOk(payload);
  } catch (e) {
    console.error("[api/track GET]", e);
    return jsonError("Could not load tracking", 500);
  }
}

/** @deprecated Prefer GET /api/track?order=&email= — kept for older clients */
export async function POST(req: Request) {
  try {
    await connectDb();
    const body = postSchema.parse(await req.json());
    const order = await findOrderForPublicTrack(body.orderNumber, body.email);
    if (!order) {
      return jsonError("Order not found. Check your order number and email.", 404);
    }
    const awb = order.shiprocket?.awb;
    const { events, refreshFailed } = await loadEventsWithOptionalRefresh(String(order._id), awb);
    const payload = buildTrackPayload({
      order,
      events,
      mode: "public",
      lastFetchAttemptFailed: refreshFailed,
    });
    return jsonOk(payload);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Enter order number and email", 400);
    console.error("[api/track POST]", e);
    return jsonError("Could not load tracking", 500);
  }
}
