export interface EmailTemplate {
  subject: string;
  html: string;
}

export function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F5F0EA;font-family:Inter,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table width="580" cellpadding="0" cellspacing="0"
             style="max-width:580px;width:100%;background:#fff;
                    border-radius:12px;overflow:hidden;
                    border:1px solid #E8E0D6">
        <tr>
          <td style="background:#1A1A1A;padding:20px 32px">
            <span style="font-size:20px;font-weight:700;color:#fff">
              Prisbo <span style="color:#C47A2B">Creations</span>
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#1A1A1A;font-size:15px;
                     line-height:1.7">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #E8E0D6;
                     background:#FDFAF7;font-size:12px;color:#6B6560;
                     text-align:center">
            Prisbo Creations · Hyderabad, India<br>
            <a href="https://prisbocreations.com"
               style="color:#C47A2B;text-decoration:none">
              prisbocreations.com
            </a>
            &nbsp;·&nbsp;
            <a href="https://prisbocreations.com/pages/privacy"
               style="color:#6B6560;text-decoration:none">
              Privacy
            </a>
            &nbsp;·&nbsp;
            <a href="https://prisbocreations.com/account/notifications"
               style="color:#6B6560;text-decoration:none">
              Unsubscribe
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function btn(text: string, url: string): string {
  return `
<p style="margin:24px 0 0">
  <a href="${url}"
     style="display:inline-block;background:#C47A2B;color:#fff;
            text-decoration:none;font-size:14px;font-weight:600;
            padding:12px 28px;border-radius:100px;letter-spacing:0.02em">
    ${text}
  </a>
</p>`;
}

export function orderItemsTable(items: {
  name: string;
  variant: string;
  size?: string | null;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}[]): string {
  const rows = items
    .map(
      (i) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #E8E0D6;
               vertical-align:top">
      <img src="${i.imageUrl}" width="56" height="56"
           style="border-radius:6px;object-fit:cover;
                  display:block;flex-shrink:0" alt="">
    </td>
    <td style="padding:10px 12px;border-bottom:1px solid #E8E0D6;
               vertical-align:top">
      <div style="font-weight:600;font-size:13px">${i.name}</div>
      <div style="color:#6B6560;font-size:12px;margin-top:2px">
        ${i.variant}${i.size ? " / " + i.size : ""} · Qty ${i.quantity}
      </div>
    </td>
    <td style="padding:10px 0;border-bottom:1px solid #E8E0D6;
               text-align:right;vertical-align:top;font-weight:600;
               font-size:13px;white-space:nowrap">
      ₹${(i.unitPrice * i.quantity).toLocaleString("en-IN")}
    </td>
  </tr>`,
    )
    .join("");

  return `
<table width="100%" cellpadding="0" cellspacing="0"
       style="margin:16px 0">
  ${rows}
</table>`;
}

export function divider(): string {
  return `<hr style="border:none;border-top:1px solid #E8E0D6;margin:24px 0">`;
}

export function addressBlock(a: {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
}): string {
  return `
<div style="background:#FDFAF7;border:1px solid #E8E0D6;
            border-radius:8px;padding:14px 16px;font-size:13px;
            line-height:1.7;color:#1A1A1A">
  <strong>${a.fullName}</strong> · ${a.phone}<br>
  ${a.line1}${a.line2 ? ", " + a.line2 : ""}<br>
  ${a.city}, ${a.state} – ${a.pincode}
</div>`;
}

export function amberBadge(text: string): string {
  return `<span style="display:inline-block;background:#F5E6D0;
    color:#9A5E1E;font-size:12px;font-weight:600;padding:3px 10px;
    border-radius:20px">${text}</span>`;
}
