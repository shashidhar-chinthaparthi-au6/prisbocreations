export type TrackingStage =
  | "PLACED"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RTO";

export interface StageConfig {
  stage: TrackingStage;
  label: string;
  description: string;
  icon: "clipboard" | "check" | "box" | "truck" | "map-pin" | "home" | "x" | "rotate-ccw";
}

export const STAGES: StageConfig[] = [
  { stage: "PLACED", label: "Order placed", description: "We received your order", icon: "clipboard" },
  { stage: "CONFIRMED", label: "Confirmed", description: "Order confirmed and being prepared", icon: "check" },
  { stage: "PACKED", label: "Packed & dispatched", description: "Your order is packed and picked up", icon: "box" },
  { stage: "SHIPPED", label: "In transit", description: "On its way to you", icon: "truck" },
  { stage: "OUT_FOR_DELIVERY", label: "Out for delivery", description: "Your delivery partner is nearby", icon: "map-pin" },
  { stage: "DELIVERED", label: "Delivered", description: "Your order has been delivered", icon: "home" },
];

/** Normal happy-path timeline order */
export const FLOW_STAGES: TrackingStage[] = [
  "PLACED",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const FLOW_INDEX: Partial<Record<TrackingStage, number>> = Object.fromEntries(
  FLOW_STAGES.map((s, i) => [s, i]),
) as Partial<Record<TrackingStage, number>>;

export function flowStageIndex(stage: TrackingStage): number {
  const i = FLOW_INDEX[stage];
  return typeof i === "number" ? i : -1;
}

/** Latest meaningful stage from webhook/API events, else from order.status. */
export function deriveCurrentStage(
  orderStatus: string,
  events: { status: string }[],
): TrackingStage {
  for (const e of events) {
    const st = stageFromShiprocketStatus(e.status);
    if (st === "RTO" || st === "CANCELLED") return st;
  }
  let maxIdx = -1;
  let maxStage: TrackingStage = "PLACED";
  for (const e of events) {
    const st = stageFromShiprocketStatus(e.status);
    if (st === "RTO" || st === "CANCELLED") continue;
    const idx = flowStageIndex(st);
    if (idx > maxIdx) {
      maxIdx = idx;
      maxStage = st;
    }
  }
  if (maxIdx >= 0) return maxStage;

  const os = orderStatus;
  if (os === "cancelled") return "CANCELLED";
  if (os === "shipped") return "SHIPPED";
  if (os === "processing" || os === "paid") return "CONFIRMED";
  return "PLACED";
}

/** Map Shiprocket raw status strings → display stages */
export const SHIPROCKET_TO_STAGE: Record<string, TrackingStage> = {
  Pending: "PLACED",
  "Order Created": "PLACED",
  "Pickup Scheduled": "CONFIRMED",
  "Pickup Generated": "CONFIRMED",
  "Pickup Queued": "CONFIRMED",
  "Manifest Generated": "CONFIRMED",
  "Out for Pickup": "CONFIRMED",
  "Picked Up": "PACKED",
  "In Transit": "SHIPPED",
  "Reached at Hub": "SHIPPED",
  "Reached at Destination Hub": "SHIPPED",
  "Out for Delivery": "OUT_FOR_DELIVERY",
  Delivered: "DELIVERED",
  "RTO Initiated": "RTO",
  "RTO In Transit": "RTO",
  "RTO Reached at Hub": "RTO",
  "RTO Out for Delivery": "RTO",
  "RTO Delivered": "RTO",
  Cancelled: "CANCELLED",
  Lost: "CANCELLED",
  "Shipment Destroyed": "CANCELLED",
};

export function stageFromShiprocketStatus(raw: string): TrackingStage {
  const t = raw.trim();
  if (!t) return "SHIPPED";
  if (SHIPROCKET_TO_STAGE[t]) return SHIPROCKET_TO_STAGE[t]!;
  const lower = t.toLowerCase();
  for (const [k, v] of Object.entries(SHIPROCKET_TO_STAGE)) {
    if (k.toLowerCase() === lower) return v;
  }
  if (lower.includes("rto")) return "RTO";
  if (lower.includes("cancel") || lower.includes("lost") || lower.includes("destroyed")) return "CANCELLED";
  if (lower.includes("delivered") && !lower.includes("rto")) return "DELIVERED";
  if (lower.includes("out for delivery")) return "OUT_FOR_DELIVERY";
  if (lower.includes("pickup") || lower.includes("picked") || lower.includes("manifest")) return "PACKED";
  if (lower.includes("transit") || lower.includes("hub")) return "SHIPPED";
  return "SHIPPED";
}

export type OrderStatusBadgeKey =
  | "PENDING"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RTO";

export const STATUS_BADGE: Record<
  OrderStatusBadgeKey,
  { label: string; bg: string; text: string }
> = {
  PENDING: { label: "Processing", bg: "#EFF6FF", text: "#1D4ED8" },
  CONFIRMED: { label: "Confirmed", bg: "#EFF6FF", text: "#1D4ED8" },
  PACKED: { label: "Packed", bg: "#F5E6D0", text: "#9A5E1E" },
  SHIPPED: { label: "In transit", bg: "#F5E6D0", text: "#9A5E1E" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", bg: "#FEF3C7", text: "#92400E" },
  DELIVERED: { label: "Delivered", bg: "#ECFDF5", text: "#065F46" },
  CANCELLED: { label: "Cancelled", bg: "#FEF2F2", text: "#991B1B" },
  RTO: { label: "Return initiated", bg: "#FEF2F2", text: "#991B1B" },
};
