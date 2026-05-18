import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

export function proofReadyEmail(data: {
  firstName: string;
  orderNumber: string;
  productName: string;
  proofUrl: string;
}): EmailTemplate {
  return {
    subject: `Your design proof is ready — please approve #${data.orderNumber}`,
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  Your proof is ready to review
</h2>
<p style="color:#6B6560;margin:0 0 24px">
  Hi ${data.firstName}, we&apos;ve prepared your personalised design for <strong>${data.productName}</strong>.
  Please review it carefully and approve before we start printing.
</p>

<div style="background:#F5E6D0;border-radius:8px;padding:14px 16px;margin-bottom:24px">
  <div style="font-size:13px;color:#6B6560">Order number</div>
  <div style="font-size:16px;font-weight:700">#${data.orderNumber}</div>
</div>

<p style="color:#6B6560;font-size:13px;margin:0 0 24px;line-height:1.6">
  Once you approve, production starts immediately. If anything needs changing,
  you can request a revision and we&apos;ll send a revised proof within 24 hours.
</p>

${btn("Review & approve your proof", data.proofUrl)}

<p style="color:#6B6560;font-size:12px;margin-top:24px;line-height:1.6">
  By approving, you confirm the design is correct. Approved proofs cannot be
  refunded for design reasons.
</p>
`),
  };
}
