/**
 * Shared URL helpers for storefront listing (?sub=&sub=&subcategoryCategory=…) and Next searchParams objects.
 */

export function parseSubcategoryPairsFromSearch(
  getAll: (key: string) => string[],
  get: (key: string) => string | null,
): Array<{ slug: string; categorySlug?: string }> | undefined {
  const subs = getAll("sub").map((s) => s.trim()).filter(Boolean);
  const legacy = get("subcategory")?.trim();
  const orderedSubs = subs.length ? subs : legacy ? [legacy] : [];

  if (!orderedSubs.length) return undefined;

  const parents = getAll("subcategoryCategory").map((s) => s.trim()).filter(Boolean);
  return orderedSubs.map((slug, i) => ({
    slug,
    ...(parents[i] ? { categorySlug: parents[i] } : {}),
  }));
}

/** App Router server `searchParams` (`string | string[]`). */
export function parseSubcategoryPairsFromNextSearchParams(
  sp: Record<string, string | string[] | undefined>,
): Array<{ slug: string; categorySlug?: string }> | undefined {
  const subs: string[] = [];

  const subVal = sp.sub;
  if (Array.isArray(subVal)) {
    for (const s of subVal) {
      if (typeof s === "string" && s.trim()) subs.push(s.trim());
    }
  } else if (typeof subVal === "string" && subVal.trim()) {
    subs.push(subVal.trim());
  }

  const legacy = sp.subcategory;
  if (!subs.length && typeof legacy === "string" && legacy.trim()) {
    subs.push(legacy.trim());
  }

  const parents: string[] = [];
  const pVal = sp.subcategoryCategory;
  if (Array.isArray(pVal)) {
    for (const s of pVal) {
      if (typeof s === "string" && s.trim()) parents.push(s.trim());
    }
  } else if (typeof pVal === "string" && pVal.trim()) {
    parents.push(pVal.trim());
  }

  if (!subs.length) return undefined;

  return subs.map((slug, i) => ({
    slug,
    ...(parents[i] ? { categorySlug: parents[i] } : {}),
  }));
}

export function parseCategoriesFromNextSearchParams(
  sp: Record<string, string | string[] | undefined>,
): string[] | undefined {
  const out: string[] = [];
  const csv = typeof sp.categories === "string" ? sp.categories : undefined;
  if (csv?.trim()) out.push(...csv.split(",").map((s) => s.trim()).filter(Boolean));

  const cat = sp.category;
  if (Array.isArray(cat)) {
    for (const x of cat) {
      if (typeof x === "string" && x.trim()) out.push(x.trim());
    }
  } else if (typeof cat === "string" && cat.trim()) {
    out.push(cat.trim());
  }

  const dedup = [...new Set(out.map((s) => s.trim()))];
  return dedup.length ? dedup : undefined;
}
