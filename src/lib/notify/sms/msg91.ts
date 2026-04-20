import { connectDb } from "@/lib/db";
import { logNotificationEntry, maskPhone } from "@/lib/notify/notification-log";

export interface Msg91FlowPayload {
  template_id: string;
  short_url: "0" | "1";
  recipients: {
    mobiles: string;
    VAR1?: string;
    VAR2?: string;
    VAR3?: string;
    VAR4?: string;
    [key: string]: string | undefined;
  }[];
}

export type SendSMSLogContext = {
  event: string;
  orderId?: string | null;
  userId?: string | null;
};

export async function sendSMS(
  payload: Msg91FlowPayload,
  log?: SendSMSLogContext,
): Promise<void> {
  const mobile = payload.recipients[0]?.mobiles ?? "";
  if (process.env.SMS_ENABLED !== "true") {
    console.log("[notify/sms] (disabled)", JSON.stringify(payload));
    return;
  }

  try {
    await connectDb().catch(() => {});
    const res = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_AUTHKEY!,
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as { type?: string; message?: string };
    if (data.type !== "success") {
      console.error("[notify/sms] Msg91 error:", JSON.stringify(data));
      if (log) {
        await logNotificationEntry({
          ...log,
          channel: "sms",
          recipient: maskPhone(mobile),
          status: "failed",
          error: JSON.stringify(data).slice(0, 500),
        });
      }
      return;
    }
    if (log) {
      await logNotificationEntry({
        ...log,
        channel: "sms",
        recipient: maskPhone(mobile),
        status: "sent",
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[notify/sms]", msg);
    if (log) {
      await logNotificationEntry({
        ...log,
        channel: "sms",
        recipient: maskPhone(mobile),
        status: "failed",
        error: msg,
      });
    }
  }
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}
