"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchaseClient } from "@/components/product/ProductPurchaseClient";
import {
  type ProductColorVariant,
  galleryImagesForColor,
} from "@/lib/product-color-variants";
import type { PurchaseProduct } from "@/components/product/ProductPurchaseClient";

type Props = {
  defaultImages: string[];
  colorVariants: ProductColorVariant[];
  galleryProductName: string;
  sku: string;
  title: string;
  breadcrumb: React.ReactNode;
  backLink: React.ReactNode;
  descriptionHtml: string;
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
  tags,
  product,
}: Props) {
  const [colorKey, setColorKey] = useState(() => colorVariants[0]?.key ?? "");

  useEffect(() => {
    if (!colorVariants.length) return;
    setColorKey((k) => (colorVariants.some((c) => c.key === k) ? k : colorVariants[0].key));
  }, [colorVariants]);

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
    <div className="grid items-start gap-10 lg:grid-cols-2">
      <ProductGallery images={galleryImages} productName={galleryProductName} />
      <div className="space-y-6">
        {breadcrumb}
        <div>
          <p className="text-sm text-ink-muted">SKU {sku}</p>
          <h1 className="font-display text-3xl text-ink">{title}</h1>
          <ProductPurchaseClient
            product={product}
            descriptionHtml={descriptionHtml}
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
  );
}
