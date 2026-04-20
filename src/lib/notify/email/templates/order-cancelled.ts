import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

export function orderCancelledEmail(data: {
  firstName: string;
  orderNumber: string;
  reason?: string;
  total: number;
  paymentMethod: string;
}): EmailTemplate {
  const isPaid = data.paymentMethod !== "COD";
  return {
    subject: `Order #${data.orderNumber} has been cancelled`,
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  Your order has been cancelled
</h2>
<p style="color:#6B6560;margin:0 0 24px">
  Hi ${data.firstName}, your order
  <strong>#${data.orderNumber}</strong> has been cancelled.
  ${data.reason ? `<br>Reason: ${data.reason}` : ""}
</p>

${
  isPaid
    ? `
<div style="background:#F0FAF4;border:1px solid #A7F3D0;
            border-radius:8px;padding:14px 16px;margin-bottom:20px;
            font-size:13px">
  <strong>Refund of ₹${data.total.toLocaleString("en-IN")}</strong>
  will be credited back to your original payment method
  within 5–7 business days.
</div>`
    : ""
}

${btn("Browse products", "https://prisbocreations.com/products")}

<p style="font-size:13px;color:#6B6560;margin:20px 0 0">
  Questions about this cancellation?
  <a href="https://prisbocreations.com/pages/contact"
     style="color:#C47A2B;text-decoration:none">Contact us</a>
</p>
`),
  };
}
