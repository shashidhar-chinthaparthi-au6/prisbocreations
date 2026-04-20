export type TemplateVariantContext = {
  displayName: string;
  basePrice: number;
  mrp: number;
  skuSuffix: string;
};

export type SchemaFieldLite = {
  key: string;
  label: string;
};

export type SpecValuesMap = Record<string, string | number | boolean | null | undefined>;

const TOKEN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Built-in template variables (always available). */
export const BUILTIN_TEMPLATE_KEYS = new Set([
  "color",
  "price",
  "mrp",
  "brand",
  "sku",
]);

export function resolveTemplate(
  template: string,
  specValues: SpecValuesMap,
  variant: TemplateVariantContext,
  productBrand: string,
  skuBase: string,
  schemaFields: SchemaFieldLite[],
): string {
  const schemaByKey = new Map(schemaFields.map((f) => [f.key, f]));
  return template.replace(TOKEN, (_match, rawKey: string) => {
    const key = String(rawKey);
    if (key === "color") return variant.displayName;
    if (key === "price") return formatInr(variant.basePrice);
    if (key === "mrp") return formatInr(variant.mrp);
    if (key === "brand") return productBrand;
    if (key === "sku") return `${skuBase}-${variant.skuSuffix}`;
    const v = specValues[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v);
    }
    const lab = schemaByKey.get(key)?.label ?? key;
    return `[${lab}]`;
  });
}

export function formatInr(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(rupees));
}

/** Preview: unresolved schema tokens show as [Label] with placeholder styling handled in UI. */
export function templateToHtmlDescription(
  template: string,
  specValues: SpecValuesMap,
  variant: TemplateVariantContext,
  productBrand: string,
  skuBase: string,
  schemaFields: SchemaFieldLite[],
): string {
  const plain = resolveTemplate(template, specValues, variant, productBrand, skuBase, schemaFields);
  const escaped = plain
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escaped.replace(/\r\n/g, "\n").split("\n").join("<br/>");
}
