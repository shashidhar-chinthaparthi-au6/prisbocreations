import { isHtmlContentEmpty } from "@/lib/html-content-empty";

type PackOption = {
  key: string;
  label: string;
  pricePaise: number;
  stock: number;
  descriptionHtml?: string;
  specificationRows?: { key: string; value: string }[];
  featureLines?: string[];
  highlightLines?: string[];
};

type ProductLite = {
  options?: PackOption[];
  pricePaise: number;
  stock: number;
};

type ColorLite = { key: string };

export function getVisiblePackOptions(
  product: ProductLite,
  colorVariants: ColorLite[] | undefined,
  selectedColorKey: string | undefined,
): PackOption[] {
  const options = product.options ?? [];
  const colors = colorVariants ?? [];
  if (!colors.length || !selectedColorKey || !options.length) return options;
  const prefix = `${selectedColorKey}__`;
  const filtered = options.filter((o) => o.key.startsWith(prefix));
  return filtered.length ? filtered : options;
}

export function computeProductDisplayBlocks(input: {
  product: ProductLite;
  descriptionHtml: string;
  specificationRows: { key: string; value: string }[];
  featureLines: string[];
  highlightLines: string[];
  legacySpecificationsHtml: string;
  legacyFeaturesHtml: string;
  legacyHighlightsHtml: string;
  colorVariants: ColorLite[] | undefined;
  selectedColorKey: string | undefined;
  selectedPackKey: string;
}): {
  displayDescriptionHtml: string;
  displayFeatureLines: string[];
  displaySpecificationRows: { key: string; value: string }[];
  displayHighlightLines: string[];
} {
  const visibleOptions = getVisiblePackOptions(
    input.product,
    input.colorVariants,
    input.selectedColorKey,
  );
  const selected =
    visibleOptions.find((o) => o.key === input.selectedPackKey) ?? visibleOptions[0] ?? null;

  const specificationRows = input.specificationRows;
  const featureLines = input.featureLines;
  const highlightLines = input.highlightLines;

  let displaySpecificationRows = specificationRows;
  if (visibleOptions.length > 0) {
    const ov = selected?.specificationRows;
    if (ov && ov.length > 0) displaySpecificationRows = ov;
  }

  let displayFeatureLines = featureLines;
  if (visibleOptions.length > 0) {
    const ov = selected?.featureLines;
    if (ov && ov.length > 0) displayFeatureLines = ov;
  }

  let displayHighlightLines = highlightLines;
  if (visibleOptions.length > 0) {
    const ov = selected?.highlightLines;
    if (ov && ov.length > 0) displayHighlightLines = ov;
  }

  let displayDescriptionHtml = input.descriptionHtml;
  if (visibleOptions.length > 0) {
    const ov = selected?.descriptionHtml;
    if (ov && !isHtmlContentEmpty(ov)) displayDescriptionHtml = ov;
  }

  return {
    displayDescriptionHtml,
    displayFeatureLines,
    displaySpecificationRows,
    displayHighlightLines,
  };
}
