import { shiprocketFetch } from "@/lib/shiprocket";

export interface CourierOption {
  courier_company_id: number;
  courier_name: string;
  freight_charge: number;
  cod_charges: number;
  estimated_delivery_days: number;
  etd?: string;
}

export interface DeliveryResult {
  serviceable: boolean;
  showFreeDelivery?: boolean;
  customerShippingCharge?: number;
  estimatedDays?: string;
  estimatedDate?: string;
  codAvailable?: boolean;
  _selectedCourierId?: number;
  _selectedCourierName?: string;
  _actualCost?: number;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++;
  }
  return d;
}

/**
 * Shiprocket serviceability + pricing rules. Internal fields prefixed with `_` are stripped for clients.
 */
export async function checkServiceability(
  deliveryPincode: string,
  weight: number,
  cartTotalRupees: number,
  isCOD: boolean,
): Promise<DeliveryResult> {
  const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE?.replace(/\D/g, "").slice(0, 6);
  if (!pickupPincode || pickupPincode.length !== 6) {
    return { serviceable: false };
  }

  const del = deliveryPincode.replace(/\D/g, "").slice(0, 6);
  if (del.length !== 6) {
    return { serviceable: false };
  }

  const threshold = Number(process.env.FREE_DELIVERY_THRESHOLD ?? 1499);
  const thresholdRupees = Number.isFinite(threshold) && threshold > 0 ? threshold : 1499;

  const qs = new URLSearchParams({
    pickup_postcode: pickupPincode,
    delivery_postcode: del,
    weight: String(Math.max(0.05, weight)),
    cod: isCOD ? "1" : "0",
  });

  const raw = (await shiprocketFetch(`/courier/serviceability/?${qs.toString()}`, {
    method: "GET",
  })) as Record<string, unknown>;

  const data = (raw.data as Record<string, unknown> | undefined) ?? raw;
  const rawList =
    (data?.available_courier_companies as unknown[]) ??
    (data?.available_couriers as unknown[]) ??
    [];

  const couriers: CourierOption[] = [];
  for (const row of rawList) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = num(r.courier_company_id ?? r.courier_id ?? r.id, 0);
    if (!id) continue;
    const freight = num(r.freight_charge ?? r.rate ?? r.shipping_charge, 0);
    const cod = num(r.cod_charges ?? r.cod_charge, 0);
    const ed =
      r.estimated_delivery_days != null
        ? num(r.estimated_delivery_days, 99)
        : num((r as { etd?: unknown }).etd, 99);
    couriers.push({
      courier_company_id: id,
      courier_name: String(r.courier_name ?? r.courier_company_name ?? r.name ?? "Courier"),
      freight_charge: freight,
      cod_charges: cod,
      estimated_delivery_days: ed,
      etd: typeof r.etd === "string" ? r.etd : undefined,
    });
  }

  if (!couriers.length) {
    return { serviceable: false };
  }

  const viable = couriers.filter((c) => c.estimated_delivery_days <= 10);
  if (!viable.length) {
    return { serviceable: false };
  }

  const sorted = viable.slice().sort((a, b) => {
    const costA = a.freight_charge + (isCOD ? a.cod_charges ?? 0 : 0);
    const costB = b.freight_charge + (isCOD ? b.cod_charges ?? 0 : 0);
    return costA - costB;
  });

  const cheapest = sorted[0]!;
  const actualCost =
    cheapest.freight_charge + (isCOD ? cheapest.cod_charges ?? 0 : 0);

  const tier = sorted.filter((c) => {
    const cost = c.freight_charge + (isCOD ? c.cod_charges ?? 0 : 0);
    return cost <= actualCost + 20;
  });
  const fastest = tier.sort((a, b) => a.estimated_delivery_days - b.estimated_delivery_days)[0]!;

  const today = new Date();
  const minDate = addWorkingDays(today, fastest.estimated_delivery_days);
  const maxDate = addWorkingDays(today, fastest.estimated_delivery_days + 2);
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const qualifiesFree = cartTotalRupees >= thresholdRupees;

  const codAvailable = viable.some(
    (c) => typeof c.cod_charges === "number" && (isCOD ? c.cod_charges >= 0 : true),
  );

  return {
    serviceable: true,
    showFreeDelivery: qualifiesFree,
    customerShippingCharge: qualifiesFree ? 0 : actualCost,
    estimatedDays: `${fastest.estimated_delivery_days}–${fastest.estimated_delivery_days + 2} working days`,
    estimatedDate: `By ${fmt(minDate)}–${fmt(maxDate)}`,
    codAvailable,
    _selectedCourierId: cheapest.courier_company_id,
    _selectedCourierName: cheapest.courier_name,
    _actualCost: actualCost,
  };
}
