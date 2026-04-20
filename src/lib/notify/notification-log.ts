import { connectDb } from "@/lib/db";
import { NotificationLog } from "@/lib/models/NotificationLog";

export function maskEmail(raw: string): string {
  const s = raw.trim();
  const at = s.indexOf("@");
  if (at <= 1) return s;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  const show = Math.min(2, local.length);
  return `${local.slice(0, show)}***@${domain}`;
}

export function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length < 4) return "***";
  return `${d.slice(0, 2)}***${d.slice(-4)}`;
}

export async function hasOrderEventBeenSent(orderId: string, event: string): Promise<boolean> {
  try {
    await connectDb();
    const n = await NotificationLog.countDocuments({
      orderId,
      event,
      status: "sent",
    }).limit(1);
    return n > 0;
  } catch {
    return false;
  }
}

export async function logNotificationEntry(input: {
  orderId?: string | null;
  userId?: string | null;
  event: string;
  channel: "email" | "sms";
  recipient: string;
  status: "sent" | "failed" | "skipped";
  error?: string | null;
}): Promise<void> {
  try {
    await connectDb();
    await NotificationLog.create({
      orderId: input.orderId ?? undefined,
      userId: input.userId ?? undefined,
      event: input.event,
      channel: input.channel,
      recipient: input.recipient,
      status: input.status,
      error: input.error?.slice(0, 2000) ?? undefined,
      sentAt: new Date(),
    });
  } catch (e) {
    console.error("[notify/log] failed to persist log", e);
  }
}
