import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { applyShiprocketShipmentWebhook } from "@/lib/services/shiprocketWebhook";

export const dynamic = "force-dynamic";

function headersEqual(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/**
 * Shiprocket shipment webhooks (POST). Shiprocket forbids "shiprocket", "sr", "kr" in the URL path — do not rename this route to include those substrings.
 * Panel: Settings → Additional settings → Webhooks. Token is sent as header `x-api-key`.
 */
export async function POST(req: Request) {
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Webhook secret not configured" }, { status: 503 });
  }

  const key = req.headers.get("x-api-key") ?? "";
  if (!headersEqual(key, secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const out = await applyShiprocketShipmentWebhook(body);
    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
