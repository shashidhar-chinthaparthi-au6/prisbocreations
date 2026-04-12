import { isMsg91Configured } from "@/lib/notify/config";

/** Normalize to 91XXXXXXXXXX (no +). */
export function normalizeIndianMobile(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return d;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  if (d.length === 10) return `91${d}`;
  return null;
}

/** Msg91 Flow API (v5). Create templates in the Msg91 panel and set template IDs in env. */
export async function sendMsg91Flow(input: {
  mobiles: string;
  templateId: string;
  /** Shortcodes VAR1, VAR2, … must match the template in Msg91. */
  variables: Record<string, string>;
}): Promise<boolean> {
  if (!isMsg91Configured()) return false;
  const authkey = process.env.MSG91_AUTHKEY!.trim();
  const shortUrl = process.env.MSG91_SHORT_URL_DEFAULT ?? "0";

  const recipients = [
    {
      mobiles: input.mobiles.replace(/\D/g, ""),
      ...input.variables,
    },
  ];

  const res = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authkey,
    },
    body: JSON.stringify({
      template_id: input.templateId,
      short_url: shortUrl,
      realTimeResponse: "1",
      recipients,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[notify/msg91] Flow failed:", res.status, text.slice(0, 500));
    return false;
  }
  try {
    const j = JSON.parse(text) as { type?: string; message?: string };
    if (j?.type === "error" || j?.message?.toLowerCase().includes("error")) {
      console.error("[notify/msg91] Flow response:", text.slice(0, 500));
      return false;
    }
  } catch {
    /* non-json ok */
  }
  return true;
}
