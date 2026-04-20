import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

export function orderRtoEmail(data: {
  firstName: string;
  orderNumber: string;
  trackUrl: string;
}): EmailTemplate {
  return {
    subject: `Delivery update for order #${data.orderNumber}`,
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  We couldn't complete this delivery
</h2>
<p style="color:#6B6560;margin:0 0 24px">
  Hi ${data.firstName}, your order <strong>#${data.orderNumber}</strong> was
  returned to us (RTO). If a refund applies, it will be processed to your
  original payment method within 5–7 business days.
</p>
${btn("Order details", data.trackUrl)}
<p style="margin:20px 0 0;font-size:13px;color:#6B6560">
  Need help? <a href="https://prisbocreations.com/pages/contact" style="color:#C47A2B;text-decoration:none">Contact us</a>.
</p>
`),
  };
}
