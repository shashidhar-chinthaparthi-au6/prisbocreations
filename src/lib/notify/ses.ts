import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { isSesConfigured } from "@/lib/notify/config";

let client: SESv2Client | null = null;

/** SES SendEmail requires a mailbox; if env is a verified domain only, use noreply@domain. */
function mailboxFromEnv(raw: string): string {
  const t = raw.trim();
  if (t.includes("@")) return t;
  return `noreply@${t}`;
}

function getClient(): SESv2Client | null {
  if (!isSesConfigured()) return null;
  if (!client) {
    client = new SESv2Client({
      region: process.env.AWS_REGION!.trim(),
    });
  }
  return client;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
};

/**
 * Sends email via Amazon SES v2. Requires AWS credentials (env or instance role),
 * AWS_REGION, and SES_FROM_EMAIL (verified identity in SES).
 */
export async function sendSesEmail(input: SendEmailInput): Promise<void> {
  const c = getClient();
  if (!c) {
    console.warn("[notify/ses] Skipping email (SES not configured):", input.to, input.subject);
    return;
  }
  const from = mailboxFromEnv(process.env.SES_FROM_EMAIL!);
  const fromName = process.env.SES_FROM_NAME?.trim();
  const source = fromName ? `${fromName} <${from}>` : from;

  await c.send(
    new SendEmailCommand({
      FromEmailAddress: source,
      Destination: { ToAddresses: [input.to.trim()] },
      Content: {
        Simple: {
          Subject: { Data: input.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: input.textBody, Charset: "UTF-8" },
            ...(input.htmlBody
              ? { Html: { Data: input.htmlBody, Charset: "UTF-8" } }
              : {}),
          },
        },
      },
    }),
  );
}
