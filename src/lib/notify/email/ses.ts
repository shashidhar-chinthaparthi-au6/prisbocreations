import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { isSesConfigured } from "@/lib/notify/config";
import { maskEmail, logNotificationEntry } from "@/lib/notify/notification-log";

let client: SESv2Client | null = null;

function mailboxFromEnv(raw: string): string {
  const t = raw.trim();
  if (t.includes("@")) return t;
  return `noreply@${t}`;
}

function getClient(): SESv2Client | null {
  if (!isSesConfigured()) return null;
  if (!client) {
    const region = process.env.AWS_REGION ?? "ap-south-1";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
    client = new SESv2Client({
      region,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }
  return client;
}

export type SendEmailLogContext = {
  event: string;
  orderId?: string | null;
  userId?: string | null;
};

/**
 * Transactional HTML email via Amazon SES (v2 API).
 * Uses the same transport pattern as before; Nodemailer 7+ expects SES v2, not legacy `client-ses`.
 */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  log?: SendEmailLogContext;
}): Promise<void> {
  const toStr = Array.isArray(opts.to) ? opts.to.join(",") : opts.to;
  const firstTo = toStr.split(",")[0]?.trim() ?? toStr;

  if (process.env.EMAIL_ENABLED !== "true") {
    console.log("[notify/email] (disabled)", toStr, opts.subject);
    return;
  }

  const c = getClient();
  if (!c) {
    console.warn("[notify/email] Skipping email (SES not configured):", firstTo, opts.subject);
    return;
  }

  const from = mailboxFromEnv(process.env.SES_FROM_EMAIL!);
  const fromName = process.env.SES_FROM_NAME?.trim();
  const source = fromName ? `${fromName} <${from}>` : from;
  const textBody = opts.text ?? opts.html.replace(/<[^>]*>/g, "");

  try {
    await c.send(
      new SendEmailCommand({
        FromEmailAddress: source,
        ...(opts.replyTo ? { ReplyToAddresses: [opts.replyTo] } : {}),
        Destination: { ToAddresses: [firstTo] },
        Content: {
          Simple: {
            Subject: { Data: opts.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: textBody, Charset: "UTF-8" },
              Html: { Data: opts.html, Charset: "UTF-8" },
            },
          },
        },
      }),
    );
    if (opts.log) {
      await logNotificationEntry({
        ...opts.log,
        channel: "email",
        recipient: maskEmail(firstTo),
        status: "sent",
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[notify/email]", msg);
    if (opts.log) {
      await logNotificationEntry({
        ...opts.log,
        channel: "email",
        recipient: maskEmail(firstTo),
        status: "failed",
        error: msg,
      });
    }
  }
}

/** @deprecated Prefer sendEmail; kept for legacy call sites. */
export async function sendSesEmailCompat(input: {
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  log?: SendEmailLogContext;
}): Promise<void> {
  await sendEmail({
    to: input.to,
    subject: input.subject,
    html: input.htmlBody ?? `<pre>${input.textBody}</pre>`,
    text: input.textBody,
    log: input.log,
  });
}
