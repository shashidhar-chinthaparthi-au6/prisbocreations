"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchaseClient } from "@/components/product/ProductPurchaseClient";
import { ProductDetailSections } from "@/components/product/ProductDetailSections";
import { computeProductDisplayBlocks, getVisiblePackOptions } from "@/lib/product-display-from-selection";
import {
  type ProductColorVariant,
  galleryImagesForColor,
  listingPrimaryThumb,
} from "@/lib/product-color-variants";
import type { PurchaseProduct } from "@/components/product/ProductPurchaseClient";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { recordRecentlyViewedProductId } from "@/lib/recently-viewed-ids";
import { WishlistHeart } from "@/components/ui/WishlistHeart";
import { ReviewSection } from "@/components/reviews/ReviewSection";
import { packageDimensionSpecRows } from "@/lib/product-package-display";

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
  /** Admin product preview: no wishlist, reviews, or recently-viewed side effects. */
  adminPreview?: boolean;
  /** Deep-link selected colour (`/products/:slug?color=`). */
  initialColorKey?: string;
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
  adminPreview = false,
  initialColorKey,
}: Props) {
  const [colorKey, setColorKey] = useState(() => {
    if (initialColorKey?.trim() && colorVariants.some((c) => c.key === initialColorKey.trim())) {
      return initialColorKey.trim();
    }
    return colorVariants[0]?.key ?? "";
  });
  const [packKey, setPackKey] = useState("");

  useEffect(() => {
    if (!colorVariants.length) return;
    if (initialColorKey?.trim()) {
      const k = initialColorKey.trim();
      if (colorVariants.some((c) => c.key === k)) {
        setColorKey(k);
        return;
      }
    }
    setColorKey((existing) =>
      colorVariants.some((c) => c.key === existing) ? existing : colorVariants[0]!.key,
    );
  }, [colorVariants, initialColorKey]);

  const colorSummaries = useMemo(
    () => colorVariants.map(({ key, label }) => ({ key, label })),
    [colorVariants],
  );

  const visiblePacks = useMemo(
    () => getVisiblePackOptions(product, colorSummaries, colorSummaries.length ? colorKey : undefined),
    [product, colorSummaries, colorKey],
  );

  useEffect(() => {
    if (!visiblePacks.length) return;
    setPackKey((k) => (visiblePacks.some((o) => o.key === k) ? k : visiblePacks[0]!.key));
  }, [product.slug, visiblePacks]);

  useEffect(() => {
    if (adminPreview) return;
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
  }, [product.slug, adminPreview]);

  const galleryImages = useMemo(
    () => galleryImagesForColor(defaultImages, colorVariants, colorKey),
    [colorKey, colorVariants, defaultImages],
  );

  const cartThumbnailUrl = galleryImages[0] ?? product.image;

  const effectivePackageDims = useMemo(() => {
    const key = colorSummaries.length ? colorKey : "";
    const v = key ? colorVariants.find((c) => c.key === key) : undefined;
    const pick = (pv: number | undefined, vv: number | undefined, d: number) => {
      if (vv != null && Number.isFinite(vv) && vv > 0) return vv;
      if (pv != null && Number.isFinite(pv) && pv > 0) return pv;
      return d;
    };
    return {
      weightKg: pick(product.weightKg, v?.weightKg, 0.3),
      lengthCm: pick(product.lengthCm, v?.lengthCm, 20),
      breadthCm: pick(product.breadthCm, v?.breadthCm, 15),
      heightCm: pick(product.heightCm, v?.heightCm, 5),
    };
  }, [
    colorSummaries.length,
    colorKey,
    colorVariants,
    product.weightKg,
    product.lengthCm,
    product.breadthCm,
    product.heightCm,
  ]);

  const packageDimensionsRows = useMemo(
    () => packageDimensionSpecRows(effectivePackageDims),
    [effectivePackageDims],
  );

  const displayBlocks = useMemo(
    () =>
      computeProductDisplayBlocks({
        product,
        descriptionHtml,
        specificationRows,
        featureLines,
        highlightLines,
        legacySpecificationsHtml,
        legacyFeaturesHtml,
        legacyHighlightsHtml,
        colorVariants: colorSummaries.length ? colorSummaries : undefined,
        selectedColorKey: colorSummaries.length ? colorKey : undefined,
        selectedPackKey: packKey || visiblePacks[0]?.key || "",
      }),
    [
      product,
      descriptionHtml,
      specificationRows,
      featureLines,
      highlightLines,
      legacySpecificationsHtml,
      legacyFeaturesHtml,
      legacyHighlightsHtml,
      colorSummaries,
      colorKey,
      packKey,
      visiblePacks,
    ],
  );

  return (
    <>
    <div className="grid items-start gap-10 pb-24 md:pb-0 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-0">
      <div className="flex min-w-0 flex-col gap-8">
        <div className="relative lg:sticky lg:top-24">
          {adminPreview ? null : (
            <div className="absolute right-2 top-2 z-10 md:right-3 md:top-3">
              <WishlistHeart productId={product.id} productName={product.name} size="md" />
            </div>
          )}
          <ProductGallery images={galleryImages} productName={galleryProductName} />
        </div>
        <ProductDetailSections
          className="hidden min-w-0 border-t border-sand-deep/80 pt-8 lg:block"
          displayDescriptionHtml={displayBlocks.displayDescriptionHtml}
          displayFeatureLines={displayBlocks.displayFeatureLines}
          legacyFeaturesHtml={legacyFeaturesHtml}
          displaySpecificationRows={displayBlocks.displaySpecificationRows}
          legacySpecificationsHtml={legacySpecificationsHtml}
          displayHighlightLines={displayBlocks.displayHighlightLines}
          legacyHighlightsHtml={legacyHighlightsHtml}
          packageDimensionsRows={packageDimensionsRows}
          tags={tags}
        />
      </div>
      <div className="min-w-0 space-y-6">
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
            colorVariants={colorSummaries.length ? colorVariants : undefined}
            selectedColorKey={colorSummaries.length ? colorKey : undefined}
            onColorKeyChange={colorSummaries.length ? setColorKey : undefined}
            cartThumbnailUrl={cartThumbnailUrl}
            selectedPackKey={packKey || visiblePacks[0]?.key || ""}
            onSelectedPackKeyChange={setPackKey}
            packageDimensionsRows={packageDimensionsRows}
            detailSections="none"
          />
        </div>
        {backLink}
      </div>
    </div>
    <ProductDetailSections
      className="border-t border-sand-deep/80 pt-8 lg:hidden"
      displayDescriptionHtml={displayBlocks.displayDescriptionHtml}
      displayFeatureLines={displayBlocks.displayFeatureLines}
      legacyFeaturesHtml={legacyFeaturesHtml}
      displaySpecificationRows={displayBlocks.displaySpecificationRows}
      legacySpecificationsHtml={legacySpecificationsHtml}
      displayHighlightLines={displayBlocks.displayHighlightLines}
      legacyHighlightsHtml={legacyHighlightsHtml}
      packageDimensionsRows={packageDimensionsRows}
      tags={tags}
    />
    {adminPreview ? null : (
      <div className="mx-auto max-w-[1100px]">
        <ReviewSection productId={product.id} productSlug={product.slug} productName={product.name} />
      </div>
    )}
    </>
  );
}
