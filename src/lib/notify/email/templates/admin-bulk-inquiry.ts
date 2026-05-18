import { baseTemplate, btn } from "./index";
import type { EmailTemplate } from "./index";

export function adminBulkInquiryEmail(data: {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  productInterest?: string;
  quantity?: number;
  deadlineDate?: string;
  notes?: string;
  adminInboxUrl: string;
}): EmailTemplate {
  return {
    subject: `[Bulk Inquiry] ${data.company} — ${data.productInterest ?? "General enquiry"}`,
    html: baseTemplate(`
<h2 style="margin:0 0 16px;font-size:18px;font-weight:700">
  New bulk / corporate inquiry
</h2>

<table width="100%" style="font-size:13px;margin-bottom:20px">
  <tr>
    <td style="color:#6B6560;padding:4px 0;width:140px">Company</td>
    <td style="font-weight:600">${data.company}</td>
  </tr>
  <tr>
    <td style="color:#6B6560;padding:4px 0">Contact</td>
    <td>${data.contactName}</td>
  </tr>
  <tr>
    <td style="color:#6B6560;padding:4px 0">Email</td>
    <td><a href="mailto:${data.email}" style="color:#C47A2B">${data.email}</a></td>
  </tr>
  <tr>
    <td style="color:#6B6560;padding:4px 0">Phone</td>
    <td><a href="tel:${data.phone}" style="color:#C47A2B">${data.phone}</a></td>
  </tr>
  ${data.productInterest ? `
  <tr>
    <td style="color:#6B6560;padding:4px 0">Product interest</td>
    <td>${data.productInterest}</td>
  </tr>` : ""}
  ${data.quantity ? `
  <tr>
    <td style="color:#6B6560;padding:4px 0">Quantity</td>
    <td>${data.quantity} units</td>
  </tr>` : ""}
  ${data.deadlineDate ? `
  <tr>
    <td style="color:#6B6560;padding:4px 0">Required by</td>
    <td>${data.deadlineDate}</td>
  </tr>` : ""}
  ${data.notes ? `
  <tr>
    <td style="color:#6B6560;padding:4px 0;vertical-align:top">Notes</td>
    <td style="white-space:pre-wrap">${data.notes}</td>
  </tr>` : ""}
</table>

${btn("View in admin inbox", data.adminInboxUrl)}
`),
  };
}
