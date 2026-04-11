import { getShiprocketConfig } from "@/lib/shiprocket-config";

const BASE = "https://apiv2.shiprocket.in";

let cached: { token: string; expiresAtMs: number } | null = null;

async function login(): Promise<string> {
  const cfg = getShiprocketConfig();
  if (!cfg) throw new Error("Shiprocket is not configured");
  if (!cfg.email || !cfg.password) {
    throw new Error("Shiprocket: set SHIPROCKET_EMAIL + SHIPROCKET_PASSWORD or SHIPROCKET_BEARER_TOKEN");
  }

  const res = await fetch(`${BASE}/v1/external/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cfg.email, password: cfg.password }),
  });
  const text = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Shiprocket auth: invalid JSON (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(`Shiprocket auth ${res.status}: ${text.slice(0, 400)}`);
  }
  const token = body.token as string | undefined;
  if (!token) throw new Error("Shiprocket auth: missing token");
  // Token valid ~10 days; refresh early
  cached = { token, expiresAtMs: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return token;
}

export async function shiprocketToken(): Promise<string | null> {
  const cfg = getShiprocketConfig();
  if (!cfg) return null;
  if (cfg.bearerToken) return cfg.bearerToken;
  if (cached && Date.now() < cached.expiresAtMs) return cached.token;
  return login();
}

async function srFetch(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const token = await shiprocketToken();
  if (!token) throw new Error("Shiprocket is not configured");

  const method = (init?.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
  });
  const text = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Shiprocket ${path}: non-JSON (${res.status}) ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg =
      typeof body.message === "string"
        ? body.message
        : Array.isArray(body.errors)
          ? JSON.stringify(body.errors).slice(0, 400)
          : text.slice(0, 400);
    throw new Error(`Shiprocket ${res.status} ${path}: ${msg}`);
  }
  return body;
}

export type ShiprocketCourierQuote = {
  courierId: number;
  courierName: string;
  /** Shiprocket returns rupees for charges in most responses */
  freightCharge: number;
  codCharges: number;
  totalCharge: number;
  estimatedDeliveryDays?: string;
  rating?: number;
  raw: Record<string, unknown>;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** GET serviceability — returns courier options with freight / COD split when present */
export async function shiprocketServiceability(input: {
  deliveryPostcode: string;
  weightKg: number;
  cod: boolean;
}): Promise<ShiprocketCourierQuote[]> {
  const cfg = getShiprocketConfig();
  if (!cfg) return [];

  const qs = new URLSearchParams({
    pickup_postcode: cfg.pickupPostcode.replace(/\D/g, "").slice(0, 6),
    delivery_postcode: input.deliveryPostcode.replace(/\D/g, "").slice(0, 6),
    weight: String(input.weightKg),
    cod: input.cod ? "1" : "0",
  });

  const body = await srFetch(`/v1/external/courier/serviceability/?${qs.toString()}`, {
    method: "GET",
  });

  const data = (body.data as Record<string, unknown> | undefined) ?? body;
  const rawList =
    (data?.available_couriers as unknown[]) ??
    (data?.available_courier_companies as unknown[]) ??
    (body.available_couriers as unknown[]) ??
    [];

  const out: ShiprocketCourierQuote[] = [];
  for (const row of rawList) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const courierId = num(r.courier_company_id ?? r.courier_id ?? r.id);
    if (!courierId) continue;
    const freight = num(r.freight_charge ?? r.rate ?? r.shipping_charge);
    const cod = num(r.cod_charges ?? r.cod_charge);
    const total = num(r.total_charges ?? r.charge ?? freight + cod);
    const name = String(r.courier_name ?? r.courier_company_name ?? r.name ?? "Courier");
    out.push({
      courierId,
      courierName: name,
      freightCharge: freight,
      codCharges: cod,
      totalCharge: total || freight + cod,
      estimatedDeliveryDays:
        r.estimated_delivery_days != null ? String(r.estimated_delivery_days) : undefined,
      rating: r.rating != null ? num(r.rating) : undefined,
      raw: r,
    });
  }
  return out;
}

function splitName(full: string): { first: string; last: string } {
  const t = full.trim() || "Customer";
  const i = t.indexOf(" ");
  if (i === -1) return { first: t.slice(0, 40), last: "-" };
  return { first: t.slice(0, i).slice(0, 40), last: t.slice(i + 1).trim().slice(0, 40) || "-" };
}

function phone10(s: string): string {
  const d = s.replace(/\D/g, "");
  if (d.length >= 10) return d.slice(-10);
  return d.padStart(10, "0").slice(-10);
}

export type CreateAdhocInput = {
  channelOrderId: string;
  billing: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  paymentMethod: "Prepaid" | "COD";
  orderItems: Array<{ name: string; sku: string; units: number; sellingPriceRupees: number }>;
  /** Sum of line items (products only), rupees — must match order_items. */
  subTotalRupees: number;
  /** Delivery fee charged to the customer at checkout, rupees (COD collect = sub_total + shipping_charges). */
  shippingChargesRupees?: number;
};

export async function shiprocketCreateAdhoc(input: CreateAdhocInput): Promise<Record<string, unknown>> {
  const cfg = getShiprocketConfig();
  if (!cfg) throw new Error("Shiprocket not configured");

  const { first, last } = splitName(input.billing.fullName);
  const now = new Date();
  const orderDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const payload: Record<string, unknown> = {
    order_id: input.channelOrderId.slice(0, 50),
    order_date: orderDate,
    pickup_location: cfg.pickupLocationName,
    billing_customer_name: first,
    billing_last_name: last,
    billing_address: input.billing.address.slice(0, 200),
    billing_address_2: (input.billing.address2 ?? "").slice(0, 200),
    billing_city: input.billing.city,
    billing_pincode: input.billing.pincode.replace(/\D/g, "").slice(0, 6),
    billing_state: input.billing.state,
    billing_country: input.billing.country,
    billing_email: input.billing.email,
    billing_phone: phone10(input.billing.phone),
    shipping_is_billing: true,
    order_items: input.orderItems.map((it) => ({
      name: it.name.slice(0, 200),
      sku: it.sku.slice(0, 100),
      units: it.units,
      selling_price: Math.round(it.sellingPriceRupees * 100) / 100,
    })),
    payment_method: input.paymentMethod,
    sub_total: Math.round(input.subTotalRupees * 100) / 100,
    length: cfg.defaultLengthCm,
    breadth: cfg.defaultBreadthCm,
    height: cfg.defaultHeightCm,
    weight: cfg.defaultWeightKg,
  };

  const shipRupee = input.shippingChargesRupees ?? 0;
  if (shipRupee > 0) {
    payload.shipping_charges = Math.round(shipRupee * 100) / 100;
  }

  return srFetch("/v1/external/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function shiprocketAssignAwb(shipmentId: number, courierId: number): Promise<Record<string, unknown>> {
  return srFetch("/v1/external/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({ shipment_id: shipmentId, courier_id: courierId }),
  });
}

export async function shiprocketGeneratePickup(shipmentIds: number[]): Promise<Record<string, unknown>> {
  return srFetch("/v1/external/courier/generate/pickup", {
    method: "POST",
    body: JSON.stringify({ shipment_id: shipmentIds }),
  });
}

/** Cancel by Shiprocket order ids (numeric), not Mongo _id */
export async function shiprocketCancelOrders(shiprocketOrderIds: number[]): Promise<Record<string, unknown>> {
  if (!shiprocketOrderIds.length) return {};
  return srFetch("/v1/external/orders/cancel", {
    method: "POST",
    body: JSON.stringify({ ids: shiprocketOrderIds }),
  });
}

export async function shiprocketTrackByAwb(awb: string): Promise<Record<string, unknown>> {
  const enc = encodeURIComponent(awb.trim());
  return srFetch(`/v1/external/courier/track/awb/${enc}`, { method: "GET" });
}
