import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

export function orderOutForDeliveryEmail(data: {
  firstName: string;
  orderNumber: string;
  trackingUrl: string;
  isCod?: boolean;
}): EmailTemplate {
  const codNote =
    data.isCod === true
      ? `<p style="color:#6B6560;margin:12px 0 24px;font-size:13px">
  Please keep exact cash ready if you chose Cash on Delivery.
</p>`
      : `<p style="color:#6B6560;margin:0 0 24px;font-size:13px">
  Please ensure someone is available to receive the package.
</p>`;

  return {
    subject: `Out for delivery today! 📦 Order #${data.orderNumber}`,
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  Your order is out for delivery!
</h2>
<p style="color:#6B6560;margin:0 0 12px">
  Hi ${data.firstName}, your Prisbo order is with the delivery
  partner and should reach you today.
</p>
${codNote}
${btn("Track right now", data.trackingUrl)}
`),
  };
}
