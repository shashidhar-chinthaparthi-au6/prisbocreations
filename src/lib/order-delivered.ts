import { deriveCurrentStage } from "@/lib/trackingStatus";

type OrderLike = {
  status: string;
  shiprocket?: { webhookScans?: { activity?: string | null }[] | null } | null;
};

/** True when tracking indicates the package was delivered (or equivalent). */
export function orderIsDelivered(order: OrderLike): boolean {
  const scans = order.shiprocket?.webhookScans ?? [];
  const stage = deriveCurrentStage(
    order.status,
    scans.map((s) => ({ status: (s.activity ?? "").trim() || "—" })),
  );
  return stage === "DELIVERED";
}
