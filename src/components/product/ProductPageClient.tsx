"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchaseClient } from "@/components/product/ProductPurchaseClient";
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
import { PrintPreview } from "@/components/studio/PrintPreview";
import { normalizeKind, type DesignKind } from "@/lib/studio/composePrint";
import { loopsOf, normalizeShape, type PrintShape } from "@/lib/studio/printShape";

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
  sceneBaseUrl?: string;
  scenePlaceholder?: string;
  sceneDesignMode?: DesignKind;
  sceneZone?: PrintShape | { x: number; y: number; w: number; h: number } | null;
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
  sceneBaseUrl = "",
  scenePlaceholder = "Your design",
  sceneDesignMode = "both",
  sceneZone = null,
  initialColorKey,
}: Props) {
  const [print, setPrint] = useState({ text: "", imageUrl: "", font: "sans", fontLabel: "Modern sans" });
  const [photoOpen, setPhotoOpen] = useState<string | null>(null);
  const onPrintChange = useMemo(() => {
    return (value: { text: string; imageUrl: string; font?: string; fontLabel?: string }) => {
      setPrint((prev) =>
        prev.text === value.text &&
        prev.imageUrl === value.imageUrl &&
        prev.font === (value.font || prev.font) &&
        prev.fontLabel === (value.fontLabel || prev.fontLabel)
          ? prev
          : {
              text: value.text,
              imageUrl: value.imageUrl,
              font: value.font || prev.font,
              fontLabel: value.fontLabel || prev.fontLabel,
            },
      );
    };
  }, []);
  const printShape = useMemo(() => normalizeShape(sceneZone), [sceneZone]);
  const designKind = normalizeKind(sceneDesignMode);
  const printMode = useMemo(() => {
    const fills = loopsOf(printShape).map((loop) => loop.fill);
    if (fills.every((fill) => fill === "both")) return designKind;
    const image = fills.some((fill) => fill === "image" || fill === "both");
    const text = fills.some((fill) => fill === "text" || fill === "both");
    if (image && text) return "both" as const;
    if (image) return "image" as const;
    return "text" as const;
  }, [printShape, designKind]);
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

  const colorLabel = colorVariants.find((c) => c.key === colorKey)?.label || "";
  const printCaption =
    printMode === "image"
      ? "Upload a picture. It prints inside the area on this photo."
      : printMode === "text"
        ? "Type a line. It prints inside the area on this photo."
        : "Add a picture and a line. Both print inside the area on this photo.";

  return (
    <>
    <div className="mx-auto grid max-w-[1120px] items-start gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-x-7">
      <div className="grid min-w-0 content-start gap-3.5 overflow-hidden">
        <div className="relative overflow-hidden rounded-[28px] bg-[var(--brand-surface)]">
          {adminPreview ? null : (
            <div className="absolute right-3 top-3 z-10">
              <WishlistHeart productId={product.id} productName={product.name} size="md" />
            </div>
          )}
          <span className="pointer-events-none absolute left-4 top-4 z-10 text-[13px] font-semibold text-[var(--brand-muted)]">
            Live preview
          </span>
          {sceneBaseUrl ? (
            <PrintPreview
              baseUrl={sceneBaseUrl}
              shape={printShape}
              kind={printMode}
              placeholder={scenePlaceholder || "Your design"}
              text={print.text}
              imageUrl={print.imageUrl}
              font={print.font}
            />
          ) : (
            <ProductGallery images={galleryImages} productName={galleryProductName} />
          )}
          {colorLabel || print.fontLabel ? (
            <div className="absolute bottom-4 left-4 z-10 rounded-full bg-white px-3.5 py-1.5 text-[13px] text-[var(--brand-muted)] shadow-sm">
              {colorLabel ? <b className="font-semibold text-[var(--brand-ink)]">{colorLabel}</b> : null}
              {colorLabel ? " · " : null}
              {print.fontLabel}
            </div>
          ) : null}
        </div>
        {sceneBaseUrl ? <p className="px-1 text-[13px] text-[var(--brand-muted)]">{printCaption}</p> : null}
        {sceneBaseUrl && galleryImages.length ? (
          <div>
            <h2 className="mb-2 text-[13px] font-semibold text-[var(--brand-muted)]">Product photos</h2>
            <div className="grid grid-cols-4 gap-2.5">
              {galleryImages.slice(0, 8).map((src) => (
                <button
                  key={src}
                  type="button"
                  className="aspect-square overflow-hidden rounded-[14px] border border-[var(--brand-border)] bg-[var(--brand-surface)]"
                  onClick={() => setPhotoOpen(src)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-1 grid gap-7 sm:grid-cols-2">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--brand-ink)]">About this piece</h2>
            {displayBlocks.displayDescriptionHtml ? (
              <div
                className="prose mt-2 max-w-none text-[15px] leading-relaxed text-[var(--brand-muted)]"
                dangerouslySetInnerHTML={{ __html: displayBlocks.displayDescriptionHtml }}
              />
            ) : null}
            {displayBlocks.displayFeatureLines.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-[var(--brand-muted)]">
                {displayBlocks.displayFeatureLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {displayBlocks.displaySpecificationRows.length || packageDimensionsRows.length ? (
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--brand-ink)]">Specifications</h2>
            <table className="mt-2 w-full overflow-hidden rounded-2xl bg-white text-[15px] shadow-[0_0_0_1px_var(--brand-border)]">
              <tbody>
                {[...displayBlocks.displaySpecificationRows, ...packageDimensionsRows].map((row) => (
                  <tr key={row.key} className="border-t border-[var(--brand-border)] first:border-t-0">
                    <th className="w-[38%] px-4 py-2.5 text-left font-semibold text-[var(--brand-ink)]">{row.key}</th>
                    <td className="px-4 py-2.5 text-[var(--brand-muted)]">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : null}
        </div>
        {displayBlocks.displayHighlightLines.length ? (
          <ul className="flex flex-wrap gap-2">
            {displayBlocks.displayHighlightLines.map((line) => (
              <li key={line} className="rounded-full bg-white px-3 py-1 text-[13px] text-[var(--brand-muted)] shadow-[0_0_0_1px_var(--brand-border)]">
                {line}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="min-w-0">
        {breadcrumb}
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[var(--brand-ink)]">{title}</h1>
        {sceneBaseUrl && printMode === "text" ? (
          <p className="mt-1 text-[15px] text-[var(--brand-muted)]">Your name, printed on the piece. The preview updates as you type.</p>
        ) : null}
        <p className="mt-1 text-sm text-[var(--brand-muted)]">SKU {sku}</p>
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
          onPrintChange={sceneBaseUrl ? onPrintChange : undefined}
          printMode={sceneBaseUrl ? printMode : null}
        />
        <div className="mt-4">{backLink}</div>
      </div>
    </div>
    {photoOpen ? (
      <dialog open className="fixed inset-0 z-[80] m-auto max-h-[92vh] max-w-[min(92vw,720px)] rounded-[20px] bg-white p-0" onClick={() => setPhotoOpen(null)}>
        <button type="button" className="absolute right-3 top-3 rounded-full bg-white px-3.5 py-2 text-sm font-semibold" onClick={() => setPhotoOpen(null)}>
          Close
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoOpen} alt={galleryProductName} className="block w-full" />
      </dialog>
    ) : null}
    {adminPreview ? null : (
      <div className="mx-auto mt-8 max-w-[1120px]">
        <ReviewSection productId={product.id} productSlug={product.slug} productName={product.name} />
      </div>
    )}
    </>
  );
}
