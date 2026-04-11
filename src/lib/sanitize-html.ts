import DOMPurify from "isomorphic-dompurify";
import type { Config } from "dompurify";

/** True when HTML has no meaningful text (handles empty TipTap output). */
export function isHtmlContentEmpty(html: string): boolean {
  const noTags = html.replace(/<[^>]+>/g, " ");
  const decoded = noTags
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .trim();
  return decoded.length === 0;
}

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
