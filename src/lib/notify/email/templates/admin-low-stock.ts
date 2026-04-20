import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

export function adminLowStockEmail(data: {
  items: {
    productName: string;
    variantName: string;
    size: string;
    stock: number;
    sku: string;
    editUrl: string;
  }[];
  adminProductsUrl: string;
}): EmailTemplate {
  const rows = data.items
    .map(
      (i) => `
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid #E8E0D6;font-size:13px">
      ${i.productName}<br>
      <span style="color:#6B6560;font-size:11px">
        ${i.variantName} / ${i.size} · SKU: ${i.sku}
      </span>
    </td>
    <td style="padding:8px 0;border-bottom:1px solid #E8E0D6;
               font-size:13px;font-weight:700;
               color:${i.stock === 0 ? "#B91C1C" : "#92400E"};
               text-align:right;white-space:nowrap">
      ${i.stock === 0 ? "Out of stock" : `${i.stock} left`}
    </td>
  </tr>`,
    )
    .join("");

  return {
    subject: `[Action needed] ${data.items.length} item${data.items.length > 1 ? "s" : ""} low on stock — Prisbo`,
    html: baseTemplate(`
<h2 style="margin:0 0 16px;font-size:18px;font-weight:700">
  Stock alert
</h2>
<p style="color:#6B6560;font-size:13px;margin:0 0 20px">
  The following items are low or out of stock:
</p>
<table width="100%" cellpadding="0" cellspacing="0">
  ${rows}
</table>
${btn("Manage inventory", data.adminProductsUrl)}
`),
  };
}
