import { getSellerAddress } from "@/lib/seller-address";

/** Studio WhatsApp. Prefers the support number, then the phone printed on invoices. */
export function resolveBulkWhatsAppPhone(): string {
  const dedicated = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164?.trim();
  if (dedicated) return dedicated;
  return getSellerAddress().phone;
}

export type BulkWhatsAppDetails = {
  company?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  productInterest?: string;
  quantity?: number | string;
  budget?: string;
  customisation?: string[] | string;
  packaging?: string[] | string;
  deadlineDate?: string;
  notes?: string;
};

function filled(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

function asList(value: string[] | string | undefined): string | undefined {
  if (Array.isArray(value)) {
    const parts = value.map((part) => part.trim()).filter(Boolean);
    return parts.length ? parts.join(", ") : undefined;
  }
  return filled(value);
}

export function bulkWhatsAppHref(phone: string, details?: BulkWhatsAppDetails): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  const lines = ["Hi Prisbo, I would like a quote for a bulk order."];
  const quantity = filled(details?.quantity == null ? undefined : String(details.quantity));
  const product = filled(details?.productInterest);
  const budget = filled(details?.budget);
  const customisation = asList(details?.customisation);
  const packaging = asList(details?.packaging);
  const deadline = filled(details?.deadlineDate);
  const notes = filled(details?.notes);
  const company = filled(details?.company);
  const name = filled(details?.contactName);
  const email = filled(details?.email);
  const contactPhone = filled(details?.phone);

  if (quantity) lines.push(`Quantity: ${quantity}`);
  if (budget) lines.push(`Budget: ${budget}`);
  if (customisation) lines.push(`Customisation: ${customisation}`);
  if (packaging) lines.push(`Packaging: ${packaging}`);
  if (deadline) lines.push(`Delivery date: ${deadline}`);
  if (product) lines.push(`Pieces: ${product}`);
  if (notes) lines.push(`Notes: ${notes}`);
  if (company) lines.push(`Company: ${company}`);
  if (name) lines.push(`Name: ${name}`);
  if (contactPhone) lines.push(`Phone: ${contactPhone}`);
  if (email) lines.push(`Email: ${email}`);
  if (lines.length === 1) {
    lines.push("I have been looking at the bulk catalogue on your website.");
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
}
