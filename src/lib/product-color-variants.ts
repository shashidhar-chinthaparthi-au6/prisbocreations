export type ProductColorVariant = {
  key: string;
  label: string;
  images: string[];
};

type DocLike = { colorVariants?: unknown };

/** Normalize color variants from a Mongo lean product (array order = display order). */
export function colorVariantsFromDoc(doc: DocLike | null | undefined): ProductColorVariant[] {
  const raw = doc?.colorVariants;
  if (!Array.isArray(raw)) return [];
  const out: ProductColorVariant[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as { key?: unknown; label?: unknown; images?: unknown };
    const key = typeof r.key === "string" ? r.key.trim() : "";
    const label = typeof r.label === "string" ? r.label.trim() : "";
    if (!key || !label) continue;
    const images = Array.isArray(r.images)
      ? r.images.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      : [];
    out.push({ key, label, images });
  }
  return out;
}

/** Gallery URLs for the selected color, or product defaults when a color has no images. */
export function galleryImagesForColor(
  defaultImages: string[],
  colorVariants: ProductColorVariant[],
  selectedKey: string,
): string[] {
  if (!colorVariants.length) return defaultImages.length ? defaultImages : [];
  const v =
    colorVariants.find((c) => c.key === selectedKey) ??
    colorVariants[0] ??
    null;
  if (!v) return defaultImages.length ? defaultImages : [];
  if (v.images.length > 0) return v.images;
  return defaultImages.length ? defaultImages : [];
}

/** First color’s images for listing cards / quick thumb when colors exist. */
export function listingCarouselImages(
  defaultImages: string[],
  colorVariants: ProductColorVariant[] | undefined | null,
): string[] {
  const cv = colorVariants?.length ? colorVariants : [];
  if (cv.length && cv[0].images.length) return cv[0].images;
  return defaultImages ?? [];
}

export function listingPrimaryThumb(
  defaultImages: string[],
  colorVariants: ProductColorVariant[] | undefined | null,
): string | undefined {
  const imgs = listingCarouselImages(defaultImages, colorVariants);
  return imgs[0];
}
