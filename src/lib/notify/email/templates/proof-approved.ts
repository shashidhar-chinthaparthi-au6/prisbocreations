import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

export function proofApprovedEmail(data: {
  orderNumber: string;
  productName: string;
  adminOrderUrl: string;
}): EmailTemplate {
  return {
    subject: `[Proof Approved] Order #${data.orderNumber} — ready for production`,
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  Proof approved — start production
</h2>
<p style="color:#6B6560;margin:0 0 24px">
  The customer has approved the design proof for <strong>${data.productName}</strong>
  on order <strong>#${data.orderNumber}</strong>. All items are approved;
  the order status has been updated to <em>In Production</em>.
</p>

${btn("View order in admin", data.adminOrderUrl)}
`),
  };
}
