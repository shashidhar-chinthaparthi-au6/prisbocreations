/**
 * Legacy SES entry — transactional email is implemented in `./email/ses` (Amazon SES v2).
 */
import { sendEmail, sendSesEmailCompat } from "@/lib/notify/email/ses";

export { sendEmail } from "@/lib/notify/email/ses";

export type SendEmailInput = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
};

export async function sendSesEmail(input: SendEmailInput): Promise<void> {
  await sendSesEmailCompat({
    to: input.to,
    subject: input.subject,
    textBody: input.textBody,
    htmlBody: input.htmlBody,
  });
}
