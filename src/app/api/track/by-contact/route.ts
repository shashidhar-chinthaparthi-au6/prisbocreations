import { z } from "zod";
import { connectDb } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api/response";
import { clientIpFromRequest, requireJsonContentType } from "@/lib/auth/rate-limit-memory";
import {
  findOrdersSafeByContact,
  parseContactInput,
  contactRateLimitKey,
} from "@/lib/track-contact";
import {
  trackContactAllowContact,
  trackContactAllowIp,
  trackContactRecordFailure,
  trackContactRequiresCaptcha,
  trackContactResetFailures,
} from "@/lib/track-contact-rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile-verify";

const bodySchema = z.object({
  contact: z.string().min(3).max(200),
  turnstileToken: z.string().optional(),
});

const NO_ORDERS_MSG =
  "No orders found for this email/phone. Make sure you use the same contact you gave at checkout.";

export async function POST(req: Request) {
  if (!requireJsonContentType(req)) {
    return jsonError("Expected application/json", 415);
  }

  const ip = clientIpFromRequest(req);
  if (!trackContactAllowIp(ip)) {
    return jsonError("Too many requests. Try again in a few minutes.", 429);
  }

  let parsedBody: z.infer<typeof bodySchema>;
  try {
    parsedBody = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request", 400);
  }

  const contactRaw = parsedBody.contact.trim();
  const parsed = parseContactInput(contactRaw);
  if (!parsed) {
    return jsonError("Enter a valid email address or 10-digit phone number.", 400);
  }

  if (!trackContactAllowContact(contactRateLimitKey(parsed))) {
    return jsonError("Too many lookups for this contact. Try again later.", 429);
  }

  if (trackContactRequiresCaptcha(ip)) {
    const ok = await verifyTurnstileToken(parsedBody.turnstileToken, ip);
    if (!ok) {
      return jsonError("Please complete the security check.", 403, { requiresCaptcha: true });
    }
  }

  await connectDb();
  const rows = await findOrdersSafeByContact(contactRaw);

  if (!rows.length) {
    trackContactRecordFailure(ip);
    const needsCaptcha = trackContactRequiresCaptcha(ip);
    return jsonError(NO_ORDERS_MSG, 404, {
      ...(needsCaptcha ? { requiresCaptcha: true } : {}),
    });
  }

  trackContactResetFailures(ip);
  return jsonOk({ orders: rows });
}
