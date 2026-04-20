import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

export function resetPasswordEmail(data: { firstName: string; resetUrl: string }): EmailTemplate {
  return {
    subject: "Reset your Prisbo Creations password",
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  Reset your password
</h2>
<p style="color:#6B6560;margin:0 0 24px">
  Hi ${data.firstName}, we received a request to reset your password.
  Click the button below — this link expires in 1 hour.
</p>
${btn("Reset password", data.resetUrl)}
<p style="margin:20px 0 0;font-size:13px;color:#6B6560">
  Didn't request this? You can safely ignore this email.
  Your password won't change.
</p>
`),
  };
}
