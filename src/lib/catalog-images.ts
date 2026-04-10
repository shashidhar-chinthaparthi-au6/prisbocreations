/** Normalize category/subcategory docs that may use legacy `imageUrl` or new `images[]`. */

export type WithCatalogImages = {
  images?: string[];
  imageUrl?: string | null;
};

export function effectiveCatalogImages(doc: WithCatalogImages | null | undefined): string[] {
  if (!doc) return [];
  if (Array.isArray(doc.images) && doc.images.length) return [...doc.images];
  if (doc.imageUrl) return [doc.imageUrl];
  return [];
}

export function withNormalizedCatalogImages<T extends WithCatalogImages>(
  doc: T,
): T & { images: string[] } {
  const images = effectiveCatalogImages(doc);
  return { ...doc, images };
}
