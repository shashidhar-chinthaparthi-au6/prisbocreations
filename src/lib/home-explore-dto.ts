import { colorVariantsFromDoc, listingPrimaryThumb } from "@/lib/product-color-variants";
import {
  minOptionPricePaise,
  productHasOptions,
  type ProductOption,
} from "@/lib/product-options";

export type HomeExploreCardDTO = {
  id: string;
  slug: string;
  name: string;
  listPricePaise: number;
  compareAtPaise?: number;
  stock: number;
  imageUrl?: string;
  /** Second listing image for desktop hover swap. */
  hoverImageUrl?: string;
  multi: boolean;
  hasColorVariants: boolean;
};

/** Maps a Mongo lean product (or similar) to props for {@link HomeProductCard}. */
export function productToExploreCardDTO(p: unknown): HomeExploreCardDTO {
  const doc = p as {
    _id: unknown;
    slug: string;
    name: string;
    pricePaise: number;
    compareAtPaise?: number;
    stock: number;
    images?: string[];
    options?: ProductOption[] | null;
    colorVariants?: unknown;
  };
  const colorVariants = colorVariantsFromDoc(doc);
  const defaultImages = Array.isArray(doc.images) ? doc.images : [];
  const thumb = listingPrimaryThumb(defaultImages, colorVariants) ?? defaultImages[0];
  const hoverCandidate = defaultImages.find((u) => u && u !== thumb) ?? defaultImages[1];
  const hoverImageUrl =
    typeof hoverCandidate === "string" && hoverCandidate.trim() && hoverCandidate !== thumb
      ? hoverCandidate.trim()
      : undefined;
  const multi = productHasOptions(doc);
  const price = multi ? minOptionPricePaise(doc) : doc.pricePaise;
  const cap =
    typeof doc.compareAtPaise === "number" && Number.isFinite(doc.compareAtPaise)
      ? doc.compareAtPaise
      : undefined;
  return {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    listPricePaise: price,
    ...(typeof cap === "number" && cap > price ? { compareAtPaise: cap } : {}),
    stock: doc.stock,
    imageUrl: thumb,
    ...(hoverImageUrl ? { hoverImageUrl } : {}),
    multi,
    hasColorVariants: colorVariants.length > 0,
  };
}
