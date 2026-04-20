import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

export function orderPaidEmail(data: {
  firstName: string;
  orderNumber: string;
  total: number;
  trackUrl: string;
}): EmailTemplate {
  return {
    subject: `Payment confirmed for order #${data.orderNumber}`,
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  Payment received
</h2>
<p style="color:#6B6560;margin:0 0 24px">
  Hi ${data.firstName}, your payment of
  <strong>₹${data.total.toLocaleString("en-IN")}</strong>
  for order <strong>#${data.orderNumber}</strong> is confirmed.
  We'll start preparing your order right away.
</p>
${btn("View your order", data.trackUrl)}
`),
  };
}
