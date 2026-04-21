/**
 * Stable category hero URLs (images.unsplash.com). Avoid source.unsplash.com — it often 403s.
 * Keep in sync with `prisma/fix-images.ts` DB updates.
 */
export const CATEGORY_CARD_IMAGE_BY_SLUG: Record<string, string> = {
  "paper-packaging":
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80&auto=format&fit=crop",
  "acrylic-resin-items":
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80&auto=format&fit=crop",
  "stationery-desk-accessories":
    "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&q=80&auto=format&fit=crop",
  "home-decor-lifestyle":
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop",
  "textiles-apparel":
    "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80&auto=format&fit=crop",
};

/** Solid fallback behind category card image if URL fails or is missing. */
export const CATEGORY_CARD_FALLBACK_BG: Record<string, string> = {
  "paper-packaging": "#8B7355",
  "acrylic-resin-items": "#4A6FA5",
  "stationery-desk-accessories": "#6B8C6B",
  "home-decor-lifestyle": "#A0785A",
  "textiles-apparel": "#8B6B8B",
};

const GENERIC_CATEGORY_IMAGE =
  "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=80&auto=format&fit=crop";

export function defaultCategoryCardImageUrl(slug: string): string {
  return CATEGORY_CARD_IMAGE_BY_SLUG[slug] ?? GENERIC_CATEGORY_IMAGE;
}
