import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

/** Reserved for future “back in stock” alerts to wishlist subscribers. */
export function backInStockEmail(data: {
  firstName: string;
  productName: string;
  productUrl: string;
}): EmailTemplate {
  return {
    subject: `${data.productName} is back in stock`,
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  Good news — it's back
</h2>
<p style="color:#6B6560;margin:0 0 24px">
  Hi ${data.firstName}, <strong>${data.productName}</strong> is available again.
</p>
${btn("View product", data.productUrl)}
`),
  };
}
