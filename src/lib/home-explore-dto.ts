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
  stock: number;
  imageUrl?: string;
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
    stock: number;
    images?: string[];
    options?: ProductOption[] | null;
    colorVariants?: unknown;
  };
  const colorVariants = colorVariantsFromDoc(doc);
  const defaultImages = Array.isArray(doc.images) ? doc.images : [];
  const thumb = listingPrimaryThumb(defaultImages, colorVariants) ?? defaultImages[0];
  const multi = productHasOptions(doc);
  const price = multi ? minOptionPricePaise(doc) : doc.pricePaise;
  return {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    listPricePaise: price,
    stock: doc.stock,
    imageUrl: thumb,
    multi,
    hasColorVariants: colorVariants.length > 0,
  };
}
