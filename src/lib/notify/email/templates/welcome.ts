import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

export function welcomeEmail(data: { firstName: string }): EmailTemplate {
  return {
    subject: `Welcome to Prisbo Creations, ${data.firstName}!`,
    html: baseTemplate(`
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700">
  Welcome to Prisbo Creations 🎨
</h2>
<p style="color:#6B6560;margin:0 0 24px">
  Hi ${data.firstName}, your account is ready.
  We craft personalised gifts and keepsakes in our studio in Hyderabad —
  made for your story, not from a warehouse.
</p>

<div style="display:grid;gap:12px;margin-bottom:24px">
  <div style="background:#FDFAF7;border:1px solid #E8E0D6;
              border-radius:8px;padding:12px 16px;font-size:13px">
    📦 <strong>Track your orders</strong> from your account dashboard
  </div>
  <div style="background:#FDFAF7;border:1px solid #E8E0D6;
              border-radius:8px;padding:12px 16px;font-size:13px">
    ❤️ <strong>Save products</strong> to your wishlist
  </div>
  <div style="background:#FDFAF7;border:1px solid #E8E0D6;
              border-radius:8px;padding:12px 16px;font-size:13px">
    🏠 <strong>Save addresses</strong> for faster checkout
  </div>
</div>

${btn("Shop the catalog", "https://prisbocreations.com/products")}
`),
  };
}
