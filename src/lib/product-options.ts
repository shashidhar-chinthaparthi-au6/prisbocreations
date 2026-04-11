export type ProductOption = {
  key: string;
  label: string;
  pricePaise: number;
  stock: number;
  sku?: string;
  /** Sanitized HTML; optional — empty uses product-level description on storefront. */
  description?: string;
};

type ProductLike = {
  name: string;
  pricePaise: number;
  stock: number;
  sku: string;
  options?: ProductOption[] | null;
};

/** Normalize options from a lean product doc. */
export function productOptionsFromDoc(p: {
  options?: ProductOption[] | null;
}): ProductOption[] {
  const raw = p.options;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.filter((o) => o && typeof o.key === "string" && o.key.trim());
}

export function productHasOptions(p: { options?: ProductOption[] | null }): boolean {
  return productOptionsFromDoc(p).length > 0;
}

export function minOptionPricePaise(p: {
  options?: ProductOption[] | null;
  pricePaise: number;
}): number {
  const opts = productOptionsFromDoc(p);
  if (!opts.length) return p.pricePaise;
  return Math.min(...opts.map((o) => o.pricePaise));
}

export function resolveProductLine(
  p: ProductLike,
  optionKey?: string | null,
): {
  unitPricePaise: number;
  stock: number;
  sku: string;
  optionLabel?: string;
  optionKey?: string;
} {
  const opts = productOptionsFromDoc(p);
  if (opts.length === 0) {
    return {
      unitPricePaise: p.pricePaise,
      stock: p.stock,
      sku: p.sku,
    };
  }
  const key = optionKey?.trim();
  if (!key) {
    throw new Error(`Choose an option for ${p.name}`);
  }
  const o = opts.find((x) => x.key === key);
  if (!o) throw new Error("Invalid product option");
  return {
    unitPricePaise: o.pricePaise,
    stock: o.stock,
    sku: (o.sku && o.sku.trim()) || p.sku,
    optionLabel: o.label,
    optionKey: o.key,
  };
}
