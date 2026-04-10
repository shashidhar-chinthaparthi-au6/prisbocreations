/**
 * Derive a URL-safe slug from a display name (lowercase, hyphens, ASCII).
 * Falls back to `"item"` if the name yields nothing (e.g. only symbols).
 */
export function slugify(name: string): string {
  const raw = name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return raw || "item";
}
