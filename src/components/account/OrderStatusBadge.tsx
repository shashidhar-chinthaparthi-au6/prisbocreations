"use client";

import {
  STATUS_BADGE,
  deriveCurrentStage,
  type OrderStatusBadgeKey,
  type TrackingStage,
} from "@/lib/trackingStatus";

function badgeKey(orderStatus: string, trackingStage: TrackingStage): OrderStatusBadgeKey {
  if (orderStatus === "cancelled") return "CANCELLED";
  if (trackingStage === "RTO") return "RTO";
  if (trackingStage === "CANCELLED") return "CANCELLED";
  if (trackingStage === "DELIVERED") return "DELIVERED";
  if (trackingStage === "OUT_FOR_DELIVERY") return "OUT_FOR_DELIVERY";
  if (trackingStage === "PACKED") return "PACKED";
  if (trackingStage === "SHIPPED" || orderStatus === "shipped") return "SHIPPED";
  if (orderStatus === "pending") return "PENDING";
  return "CONFIRMED";
}

export function OrderStatusBadge({
  orderStatus,
  scanActivities,
}: {
  orderStatus: string;
  scanActivities: { activity?: string }[];
}) {
  const ev = scanActivities.map((s) => ({ status: (s.activity ?? "").trim() || "—" }));
  const stage = deriveCurrentStage(orderStatus, ev);
  const key = badgeKey(orderStatus, stage);
  const cfg = STATUS_BADGE[key];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}
