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
