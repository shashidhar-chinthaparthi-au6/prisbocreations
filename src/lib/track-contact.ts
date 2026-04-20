import mongoose from "mongoose";
import { Order } from "@/lib/models/Order";
import { User } from "@/lib/models/User";
import { deriveCurrentStage } from "@/lib/trackingStatus";
import type { TrackingStage } from "@/lib/trackingStatus";

function normalizeInvoice(s: string) {
  return s.trim().toUpperCase().replace(/\s+/g, "");
}

export type ContactKind = "email" | "phone";

export function parseContactInput(raw: string): { kind: ContactKind; normalized: string; phoneVariants: string[] } | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.includes("@")) {
    const email = t.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return { kind: "email", normalized: email, phoneVariants: [] };
  }
  const digits = t.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const last10 = digits.slice(-10);
  const variants = new Set<string>([last10, digits]);
  if (digits.length === 12 && digits.startsWith("91")) variants.add(digits.slice(2));
  if (digits.length === 11 && digits.startsWith("0")) variants.add(digits.slice(1));
  return { kind: "phone", normalized: last10, phoneVariants: [...variants] };
}

export function contactRateLimitKey(parsed: NonNullable<ReturnType<typeof parseContactInput>>): string {
  return parsed.kind === "email" ? `e:${parsed.normalized}` : `p:${parsed.normalized}`;
}

type OrderLean = {
  _id: mongoose.Types.ObjectId;
  guestEmail?: string | null;
  guestPhone?: string | null;
  userId?: mongoose.Types.ObjectId | null;
  invoiceNumber?: string;
  status: string;
  totalPaise: number;
  createdAt?: Date;
  items: Array<{ name: string; imageUrl?: string }>;
  shipping?: { city: string };
  shiprocket?: { webhookScans?: Array<{ activity?: string }> } | null;
};

export async function findOrderDocumentByNumber(orderNumber: string): Promise<OrderLean | null> {
  const inv = normalizeInvoice(orderNumber);
  let order = await Order.findOne({ invoiceNumber: inv }).lean();
  if (!order && mongoose.Types.ObjectId.isValid(orderNumber)) {
    const id = String(new mongoose.Types.ObjectId(orderNumber));
    if (id === orderNumber.trim()) {
      order = await Order.findById(orderNumber).lean();
    }
  }
  return order as OrderLean | null;
}

export async function orderMatchesContact(order: OrderLean, rawContact: string): Promise<boolean> {
  const parsed = parseContactInput(rawContact);
  if (!parsed) return false;
  if (parsed.kind === "email") {
    const em = parsed.normalized;
    if (order.guestEmail && String(order.guestEmail).trim().toLowerCase() === em) return true;
    if (order.userId) {
      const u = await User.findById(order.userId).select("email").lean();
      if (u && String(u.email ?? "").trim().toLowerCase() === em) return true;
    }
    return false;
  }
  const gp = String(order.guestPhone ?? "").replace(/\D/g, "");
  if (!gp) return false;
  return parsed.phoneVariants.some((v) => gp === v.replace(/\D/g, "") || gp.endsWith(v) || v.endsWith(gp));
}

export type SafeContactOrderRow = {
  orderNumber: string;
  placedAt: string;
  status: TrackingStage;
  itemCount: number;
  total: number;
  firstItemName: string;
  firstItemImage: string | null;
  city: string;
};

function toSafeRow(order: OrderLean): SafeContactOrderRow {
  const scans = order.shiprocket?.webhookScans ?? [];
  const stage = deriveCurrentStage(
    order.status,
    scans.map((s) => ({ status: (s.activity ?? "").trim() || "—" })),
  );
  const first = order.items?.[0];
  const placed = order.createdAt ? new Date(order.createdAt) : new Date();
  return {
    orderNumber: order.invoiceNumber?.trim() || "",
    placedAt: placed.toISOString().slice(0, 10),
    status: stage,
    itemCount: order.items?.length ?? 0,
    total: Math.round(order.totalPaise / 100),
    firstItemName: first?.name ?? "Order",
    firstItemImage: first?.imageUrl ?? null,
    city: order.shipping?.city ?? "",
  };
}

export async function findOrdersSafeByContact(raw: string): Promise<SafeContactOrderRow[]> {
  const parsed = parseContactInput(raw);
  if (!parsed) return [];

  let orders: OrderLean[] = [];

  if (parsed.kind === "email") {
    const userIds = await User.find({ email: parsed.normalized }).select("_id").lean();
    const uidList = userIds.map((u) => u._id);
    const orClause: Record<string, unknown>[] = [{ guestEmail: parsed.normalized }];
    if (uidList.length) orClause.push({ userId: { $in: uidList } });
    orders = (await Order.find({ $or: orClause }).sort({ createdAt: -1 }).limit(50).lean()) as OrderLean[];
  } else {
    const orPhone = parsed.phoneVariants.map((v) => ({ guestPhone: v }));
    orders = (await Order.find({ $or: orPhone }).sort({ createdAt: -1 }).limit(50).lean()) as OrderLean[];
  }

  return orders.filter((o) => toSafeRow(o).orderNumber).map(toSafeRow);
}
