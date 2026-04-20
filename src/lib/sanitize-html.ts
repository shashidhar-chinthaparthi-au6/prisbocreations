import DOMPurify from "isomorphic-dompurify";
import type { Config } from "dompurify";

export { isHtmlContentEmpty } from "./html-content-empty";

const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "s",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "a",
    "blockquote",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ["target"],
};

/** Safe HTML for product descriptions (admin-authored, shown on storefront). */
export function sanitizeProductDescription(html: string): string {
  return DOMPurify.sanitize(html ?? "", SANITIZE_CONFIG);
}

const PLAIN_CONFIG: Config = { ALLOWED_TAGS: [] };

/** Single-line plain text for spec keys/values (strips any HTML). */
export function sanitizePlainField(raw: string, maxLen: number): string {
  const t = DOMPurify.sanitize(raw ?? "", PLAIN_CONFIG).trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

/** Plain text lines for features/highlights (no HTML). */
export function sanitizePlainLines(rawLines: string[], maxLen: number, maxLines: number): string[] {
  const out: string[] = [];
  for (const raw of rawLines) {
    if (out.length >= maxLines) break;
    const line = DOMPurify.sanitize(raw ?? "", PLAIN_CONFIG).trim();
    if (!line) continue;
    out.push(line.length > maxLen ? line.slice(0, maxLen) : line);
  }
  return out;
}

/** Admin API: one product option (pack) with description + structured fields. */
export type AdminProductOptionPayload = {
  key: string;
  label: string;
  pricePaise: number;
  stock: number;
  sku?: string;
  description?: string;
  specificationRows?: { key: string; value: string }[];
  featureLines?: string[];
  highlightLines?: string[];
};

export function sanitizeAdminProductOption(o: AdminProductOptionPayload): AdminProductOptionPayload {
  return {
    ...o,
    description: sanitizeProductDescription(o.description ?? ""),
    specificationRows: (o.specificationRows ?? []).map((r) => ({
      key: sanitizePlainField(r.key, 120),
      value: sanitizePlainField(r.value, 2000),
    })),
    featureLines: sanitizePlainLines(o.featureLines ?? [], 500, 120),
    highlightLines: sanitizePlainLines(o.highlightLines ?? [], 500, 120),
  };
}
