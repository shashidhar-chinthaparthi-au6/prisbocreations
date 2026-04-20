import { baseTemplate, btn, orderItemsTable } from "./index";
import type { EmailTemplate } from "./index";

export function orderShippedEmail(data: {
  firstName: string;
  orderNumber: string;
  awbCode: string;
  courierName: string;
  trackingUrl: string;
  estimatedDelivery: string;
  items: Array<{
    name: string;
    variant: string;
    size?: string | null;
    quantity: number;
    unitPrice: number;
    imageUrl: string;
  }>;
  prisboTrackUrl: string;
}): EmailTemplate {
  return {
    subject: `Your Prisbo order is on its way! 🚚 #${data.orderNumber}`,
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  Your order has been dispatched!
</h2>
<p style="color:#6B6560;margin:0 0 24px">
  Hi ${data.firstName}, your order is packed and on its way to you.
</p>
<p style="color:#6B6560;margin:0 0 16px;font-size:13px">
  Carrier: <strong>Standard delivery</strong>
</p>

<div style="background:#F5E6D0;border-radius:8px;padding:14px 16px;
            margin-bottom:24px">
  <div style="font-size:13px;color:#6B6560">Order number</div>
  <div style="font-size:16px;font-weight:700">#${data.orderNumber}</div>
  <div style="margin-top:10px;font-size:13px;color:#6B6560">
    Tracking number
  </div>
  <div style="font-size:15px;font-weight:600;
              font-family:monospace">${data.awbCode}</div>
  <div style="margin-top:10px;font-size:13px;color:#6B6560">
    Estimated delivery
  </div>
  <div style="font-size:14px;font-weight:600">${data.estimatedDelivery}</div>
</div>

${orderItemsTable(data.items)}

${btn("Track your order", data.trackingUrl)}
${btn("Track on Prisbo", data.prisboTrackUrl)}
`),
  };
}
