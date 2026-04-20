import {
  addressBlock,
  amberBadge,
  baseTemplate,
  btn,
  orderItemsTable,
} from "./index";
import type { EmailTemplate } from "./index";

export function orderPlacedEmail(data: {
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
  subtotal: number;
  shippingCharge: number;
  discount: number;
  total: number;
  paymentMethod: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  estimatedDelivery: string;
  trackUrl: string;
  contactUrl?: string;
}): EmailTemplate {
  const isCOD = data.paymentMethod === "COD";
  const contact = data.contactUrl ?? "https://prisbocreations.com/pages/contact";
  return {
    subject: `Order #${data.orderNumber} confirmed — Prisbo Creations`,
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  Your order is confirmed! 🎁
</h2>
<p style="color:#6B6560;margin:0 0 24px">
  Hi ${data.firstName}, thank you for your order.
  We're getting it ready in our studio.
</p>

<div style="background:#F5E6D0;border-radius:8px;padding:14px 16px;
            margin-bottom:24px">
  <span style="font-size:13px;color:#6B6560">Order number</span><br>
  <span style="font-size:18px;font-weight:700;color:#1A1A1A">
    #${data.orderNumber}
  </span>
  &nbsp;
  ${amberBadge(isCOD ? "Cash on Delivery" : "Paid online")}
</div>

${orderItemsTable(data.items)}

<table width="100%" cellpadding="0" cellspacing="0"
       style="font-size:13px;margin-bottom:24px">
  <tr>
    <td style="color:#6B6560;padding:4px 0">Subtotal</td>
    <td style="text-align:right;padding:4px 0">
      ₹${data.subtotal.toLocaleString("en-IN")}
    </td>
  </tr>
  ${
    data.discount > 0
      ? `
  <tr>
    <td style="color:#6B6560;padding:4px 0">Discount</td>
    <td style="text-align:right;padding:4px 0;color:#2D6A4F">
      −₹${data.discount.toLocaleString("en-IN")}
    </td>
  </tr>`
      : ""
  }
  <tr>
    <td style="color:#6B6560;padding:4px 0">Delivery</td>
    <td style="text-align:right;padding:4px 0">
      ${
        data.shippingCharge === 0
          ? '<span style="color:#2D6A4F">Free</span>'
          : "₹" + data.shippingCharge.toLocaleString("en-IN")
      }
    </td>
  </tr>
  <tr>
    <td style="font-weight:700;padding:8px 0 0;
               border-top:1px solid #E8E0D6">Total</td>
    <td style="text-align:right;font-weight:700;font-size:16px;
               padding:8px 0 0;border-top:1px solid #E8E0D6">
      ₹${data.total.toLocaleString("en-IN")}
    </td>
  </tr>
</table>

<p style="font-size:13px;font-weight:600;margin:0 0 8px;color:#6B6560">
  DELIVERING TO
</p>
${addressBlock(data.shippingAddress)}

<p style="margin:16px 0 0;font-size:13px;color:#6B6560">
  Estimated delivery:
  <strong style="color:#1A1A1A">${data.estimatedDelivery}</strong>
</p>

${
  isCOD
    ? `
<div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;
            padding:12px 16px;margin:20px 0;font-size:13px">
  💡 Please keep exact change handy for the delivery partner.
</div>`
    : ""
}

${btn("Track your order", data.trackUrl)}

<p style="margin:20px 0 0;font-size:13px;color:#6B6560">
  Questions? Just reply to this email or
  <a href="${contact}"
     style="color:#C47A2B;text-decoration:none">contact us</a>.
</p>
`),
  };
}
