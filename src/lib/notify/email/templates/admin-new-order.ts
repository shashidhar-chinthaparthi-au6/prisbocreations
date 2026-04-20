import { addressBlock, baseTemplate, btn, orderItemsTable } from "./index";
import type { EmailTemplate } from "./index";

export function adminNewOrderEmail(data: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  paymentMethod: string;
  items: Array<{
    name: string;
    variant: string;
    size?: string | null;
    quantity: number;
    unitPrice: number;
    imageUrl: string;
  }>;
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  adminOrderUrl: string;
}): EmailTemplate {
  return {
    subject: `[New Order] #${data.orderNumber} — ₹${data.total.toLocaleString("en-IN")} ${data.paymentMethod}`,
    html: baseTemplate(`
<h2 style="margin:0 0 16px;font-size:18px;font-weight:700">
  New order received
</h2>

<table width="100%" style="font-size:13px;margin-bottom:20px">
  <tr>
    <td style="color:#6B6560;padding:4px 0;width:140px">Order number</td>
    <td style="font-weight:600">#${data.orderNumber}</td>
  </tr>
  <tr>
    <td style="color:#6B6560;padding:4px 0">Customer</td>
    <td>${data.customerName}</td>
  </tr>
  <tr>
    <td style="color:#6B6560;padding:4px 0">Email</td>
    <td>${data.customerEmail}</td>
  </tr>
  <tr>
    <td style="color:#6B6560;padding:4px 0">Phone</td>
    <td>${data.customerPhone}</td>
  </tr>
  <tr>
    <td style="color:#6B6560;padding:4px 0">Payment</td>
    <td><strong>${data.paymentMethod}</strong></td>
  </tr>
  <tr>
    <td style="color:#6B6560;padding:4px 0">Total</td>
    <td><strong style="font-size:16px">
      ₹${data.total.toLocaleString("en-IN")}
    </strong></td>
  </tr>
</table>

${orderItemsTable(data.items)}
${addressBlock(data.shippingAddress)}

${btn("View order in admin", data.adminOrderUrl)}
`),
  };
}
