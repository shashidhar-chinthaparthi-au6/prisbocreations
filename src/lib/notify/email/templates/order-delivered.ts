import { baseTemplate, btn, orderItemsTable } from "./index";
import type { EmailTemplate } from "./index";

export function orderDeliveredEmail(data: {
  firstName: string;
  orderNumber: string;
  items: Array<{
    name: string;
    variant: string;
    size?: string | null;
    quantity: number;
    unitPrice: number;
    imageUrl: string;
  }>;
  reviewUrl: string;
}): EmailTemplate {
  return {
    subject: `Your order has been delivered 🎁 #${data.orderNumber}`,
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  Your order has been delivered!
</h2>
<p style="color:#6B6560;margin:0 0 24px">
  Hi ${data.firstName}, your Prisbo Creations order has arrived.
  We hope you love it!
</p>

${orderItemsTable(data.items)}

<div style="background:#F0FAF4;border:1px solid #A7F3D0;border-radius:8px;
            padding:16px;margin:20px 0;text-align:center">
  <p style="margin:0 0 12px;font-size:15px;font-weight:600">
    Happy with your order?
  </p>
  <p style="margin:0 0 16px;font-size:13px;color:#6B6560">
    Leave a quick review — it helps other shoppers and means
    a lot to our small studio.
  </p>
  ${btn("Write a review", data.reviewUrl)}
</div>

<p style="font-size:13px;color:#6B6560;margin:20px 0 0">
  Something not right?
  <a href="https://prisbocreations.com/pages/contact"
     style="color:#C47A2B;text-decoration:none">
    Contact us
  </a>
  and we'll make it right.
</p>
`),
  };
}
