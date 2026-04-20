import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

export function emailChangeEmail(data: { firstName: string; verifyUrl: string }): EmailTemplate {
  return {
    subject: "Confirm your new email — Prisbo Creations",
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  Confirm your new email
</h2>
<p style="color:#6B6560;margin:0 0 24px">
  Hi ${data.firstName}, you requested to change the email on your account.
  Use the button below within 24 hours to confirm this address.
</p>
${btn("Confirm new email", data.verifyUrl)}
<p style="margin:20px 0 0;font-size:13px;color:#6B6560">
  If you did not request this change, you can ignore this email.
</p>
`),
  };
}
