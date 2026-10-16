import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string | undefined): string {
  if (!value?.trim()) return "";
  return `<tr>
    <td style="color:#6B6560;padding:4px 0;width:140px;vertical-align:top">${label}</td>
    <td style="white-space:pre-wrap">${esc(value)}</td>
  </tr>`;
}

export function adminBulkInquiryEmail(data: {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  productInterest?: string;
  quantity?: number;
  budget?: string;
  customisation?: string;
  deadlineDate?: string;
  notes?: string;
  adminInboxUrl: string;
}): EmailTemplate {
  const interest = data.productInterest?.trim() || "General enquiry";
  return {
    subject: `[Bulk Inquiry] ${data.company} — ${interest}`,
    html: baseTemplate(`
<h2 style="margin:0 0 16px;font-size:18px;font-weight:700">
  New bulk / corporate inquiry
</h2>

<table width="100%" style="font-size:13px;margin-bottom:20px">
  <tr>
    <td style="color:#6B6560;padding:4px 0;width:140px">Company</td>
    <td style="font-weight:600">${esc(data.company)}</td>
  </tr>
  <tr>
    <td style="color:#6B6560;padding:4px 0">Contact</td>
    <td>${esc(data.contactName)}</td>
  </tr>
  <tr>
    <td style="color:#6B6560;padding:4px 0">Email</td>
    <td><a href="mailto:${esc(data.email)}" style="color:#C47A2B">${esc(data.email)}</a></td>
  </tr>
  <tr>
    <td style="color:#6B6560;padding:4px 0">Phone</td>
    <td><a href="tel:${esc(data.phone)}" style="color:#C47A2B">${esc(data.phone)}</a></td>
  </tr>
  ${row("Pieces", data.productInterest)}
  ${data.quantity ? row("Quantity", `${data.quantity} pieces`) : ""}
  ${row("Budget", data.budget)}
  ${row("Customisation", data.customisation)}
  ${row("Delivery date", data.deadlineDate)}
  ${row("Notes", data.notes)}
</table>

${btn("View in admin inbox", data.adminInboxUrl)}
`),
  };
}
