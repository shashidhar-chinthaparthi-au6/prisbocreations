import { defaultCategoryCardImageUrl } from "@/lib/category-hero-images";

/** Fallback image when category has no `imageUrl` / `images` in DB. Uses stable images.unsplash.com URLs. */
export function categoryCardPlaceholderImage(slug: string, _name: string): string {
  return defaultCategoryCardImageUrl(slug);
}
