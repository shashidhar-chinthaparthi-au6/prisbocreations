"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchaseClient } from "@/components/product/ProductPurchaseClient";
import {
  type ProductColorVariant,
  galleryImagesForColor,
  listingPrimaryThumb,
} from "@/lib/product-color-variants";
import type { PurchaseProduct } from "@/components/product/ProductPurchaseClient";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { recordRecentlyViewedProductId } from "@/lib/recently-viewed-ids";
import { WishlistHeart } from "@/components/ui/WishlistHeart";
import { ProductReviewsSection } from "@/components/product-detail/ProductReviewsSection";

type Props = {
  defaultImages: string[];
  colorVariants: ProductColorVariant[];
  galleryProductName: string;
  sku: string;
  title: string;
  breadcrumb: React.ReactNode;
  backLink: React.ReactNode;
  descriptionHtml: string;
  specificationRows: { key: string; value: string }[];
  featureLines: string[];
  highlightLines: string[];
  legacySpecificationsHtml: string;
  legacyFeaturesHtml: string;
  legacyHighlightsHtml: string;
  tags: string[];
  product: PurchaseProduct;
};

export function ProductPageClient({
  defaultImages,
  colorVariants,
  galleryProductName,
  sku,
  title,
  breadcrumb,
  backLink,
  descriptionHtml,
  specificationRows,
  featureLines,
  highlightLines,
  legacySpecificationsHtml,
  legacyFeaturesHtml,
  legacyHighlightsHtml,
  tags,
  product,
}: Props) {
  const [colorKey, setColorKey] = useState(() => colorVariants[0]?.key ?? "");

  useEffect(() => {
    if (!colorVariants.length) return;
    setColorKey((k) => (colorVariants.some((c) => c.key === k) ? k : colorVariants[0].key));
  }, [colorVariants]);

  useEffect(() => {
    const thumb =
      listingPrimaryThumb(defaultImages, colorVariants) ??
      product.image ??
      defaultImages[0] ??
      "";
    recordRecentlyViewed({
      slug: product.slug,
      name: product.name,
      pricePaise: product.pricePaise,
      image: thumb,
    });
    recordRecentlyViewedProductId(product.id);
    // Intentionally when navigating to another product (slug), not on every gallery tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug]);

  const galleryImages = useMemo(
    () => galleryImagesForColor(defaultImages, colorVariants, colorKey),
    [colorKey, colorVariants, defaultImages],
  );

  const colorSummaries = useMemo(
    () => colorVariants.map(({ key, label }) => ({ key, label })),
    [colorVariants],
  );

  const cartThumbnailUrl = galleryImages[0] ?? product.image;

  return (
    <>
    <div className="grid items-start gap-10 pb-24 md:pb-0 lg:grid-cols-2">
      <div className="relative lg:sticky lg:top-24">
        <div className="absolute right-2 top-2 z-10 md:right-3 md:top-3">
          <WishlistHeart productId={product.id} productName={product.name} size="md" />
        </div>
        <ProductGallery images={galleryImages} productName={galleryProductName} />
      </div>
      <div className="space-y-6">
        {breadcrumb}
        <div>
          <p className="text-sm text-ink-muted">SKU {sku}</p>
          <h1 className="font-display text-3xl text-ink">{title}</h1>
          <ProductPurchaseClient
            product={product}
            descriptionHtml={descriptionHtml}
            specificationRows={specificationRows}
            featureLines={featureLines}
            highlightLines={highlightLines}
            legacySpecificationsHtml={legacySpecificationsHtml}
            legacyFeaturesHtml={legacyFeaturesHtml}
            legacyHighlightsHtml={legacyHighlightsHtml}
            tags={tags}
            colorVariants={colorSummaries.length ? colorSummaries : undefined}
            selectedColorKey={colorSummaries.length ? colorKey : undefined}
            onColorKeyChange={colorSummaries.length ? setColorKey : undefined}
            cartThumbnailUrl={cartThumbnailUrl}
          />
        </div>
        {backLink}
      </div>
    </div>
    <div className="mx-auto max-w-[1100px]">
      <ProductReviewsSection productId={product.id} productSlug={product.slug} />
    </div>
    </>
  );
}
