import type { NavCategoryTreeItem } from "@/lib/services/catalogService";
import { parseRecipientSlug, type RecipientSlug } from "@/lib/recipients";
import type { RawAssistantFilters } from "@/lib/sarvam/assistant-schema";

export type SubcategoryFilterSpec = {
  slug: string;
  category?: string;
};

/** Validated filter fields ready for URL serialization. */
export type ValidatedListingFilters = {
  q?: string;
  /** Union of category browse slugs when the assistant narrows broadly. */
  categories?: string[];
  /** Union of subcategory slugs (granular). Prefer over overlapping category filters. */
  subcategories?: SubcategoryFilterSpec[];
  recipient?: RecipientSlug;
  sort?: string;
  price_min?: number;
  price_max?: number;
  in_stock?: boolean;
  occasion?: string;
  material?: string;
  rating?: "4";
};

export function validateAssistantFiltersAgainstCatalog(
  raw: RawAssistantFilters | null | undefined,
  tree: NavCategoryTreeItem[],
): ValidatedListingFilters | null {
  if (!raw) return null;

  const cats = new Map(tree.map((c) => [c.slug, c]));

  const categorySlugsOut: string[] = [];
  const addCat = (slug: string | undefined | null) => {
    if (!slug?.trim()) return;
    const c = cats.get(slug.trim());
    if (c && !categorySlugsOut.includes(c.slug)) categorySlugsOut.push(c.slug);
  };

  if (Array.isArray(raw.categories)) {
    for (const s of raw.categories) {
      if (typeof s === "string") addCat(s);
    }
  }

  addCat(raw.category?.trim());

  const subsOut: SubcategoryFilterSpec[] = [];
  const seenSub = new Set<string>();

  const pushSub = (slugRaw: string, parentRaw?: string | null) => {
    const subSlug = slugRaw.trim().toLowerCase();
    if (!subSlug || seenSub.has(subSlug)) return;

    const parentHint = parentRaw?.trim();

    let found: SubcategoryFilterSpec | null = null;

    if (parentHint) {
      const parentNode = cats.get(parentHint);
      if (!parentNode) return;
      const sub = parentNode.subcategories.find((s) => s.slug.toLowerCase() === subSlug);
      if (sub) found = { slug: sub.slug, category: parentNode.slug };
    } else {
      for (const c of tree) {
        const sub = c.subcategories.find((s) => s.slug.toLowerCase() === subSlug);
        if (sub) {
          found = { slug: sub.slug, category: c.slug };
          break;
        }
      }
    }

    if (found) {
      seenSub.add(subSlug);
      subsOut.push(found);
    }
  };

  if (Array.isArray(raw.subcategories)) {
    for (const row of raw.subcategories) {
      if (!row || typeof row !== "object") continue;
      const slug = typeof row.slug === "string" ? row.slug : "";
      const pc =
        typeof (row as { category?: unknown }).category === "string" ?
          (row as { category: string }).category
        : null;
      pushSub(slug, pc);
    }
  }

  if (raw.subcategory?.trim() && !raw.subcategories?.length) {
    pushSub(raw.subcategory, raw.category ?? undefined);
  }

  const out: ValidatedListingFilters = {};

  if (raw.recipient?.trim()) {
    const r = parseRecipientSlug(raw.recipient.trim());
    if (r) out.recipient = r;
  }

  if (subsOut.length) out.subcategories = subsOut;

  /** Category union applies when shopper wants breadth (no subs) or extra categories beside subs already tied to distinct parents */
  if (categorySlugsOut.length) {
    if (!subsOut.length) {
      out.categories = [...categorySlugsOut];
    } else {
      const subParents = new Set(subsOut.map((s) => s.category).filter(Boolean) as string[]);
      const extra = categorySlugsOut.filter((slug) => !subParents.has(slug));
      if (extra.length) out.categories = extra;
    }
  }

  if (raw.q?.trim()) out.q = raw.q.trim();

  if (raw.sort) out.sort = raw.sort;

  if (raw.price_min != null && Number.isFinite(raw.price_min) && raw.price_min >= 0) {
    out.price_min = raw.price_min;
  }
  if (raw.price_max != null && Number.isFinite(raw.price_max) && raw.price_max >= 0) {
    out.price_max = raw.price_max;
  }

  if (raw.in_stock === true) out.in_stock = true;

  if (raw.occasion?.trim()) out.occasion = raw.occasion.trim().slice(0, 64);

  if (raw.material?.trim()) out.material = raw.material.trim().slice(0, 64);

  if (raw.rating === "4") out.rating = "4";

  if (
    !out.q &&
    !(out.categories && out.categories.length) &&
    !(out.subcategories && out.subcategories.length) &&
    !out.recipient &&
    !out.sort &&
    out.price_min === undefined &&
    out.price_max === undefined &&
    out.in_stock === undefined &&
    !out.occasion &&
    !out.material &&
    !out.rating
  ) {
    return null;
  }

  return out;
}

/**
 * Build URL for listing browse: `/for/[recipient]?…` when a recipient applies
 * (`/products` ignores `recipient`; shop-by-recipient lives under `/for/…`).
 */
export function buildAssistantListingHref(
  pathname: string | undefined,
  filters: ValidatedListingFilters | null,
): string | undefined {
  if (!filters) return undefined;

  const fromPath = /^\/for\/([^/]+)/.exec(pathname ?? "");
  let recipient: RecipientSlug | undefined = filters.recipient;
  if (!recipient && fromPath) recipient = parseRecipientSlug(fromPath[1]) ?? undefined;

  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);

  if (filters.categories?.length) {
    for (const c of filters.categories) p.append("category", c);
  }

  if (filters.subcategories?.length) {
    for (const s of filters.subcategories) {
      p.append("sub", s.slug);
      if (s.category) p.append("subcategoryCategory", s.category);
    }
  }

  if (filters.sort) p.set("sort", filters.sort);
  if (filters.price_min != null) p.set("price_min", String(Math.round(filters.price_min)));
  if (filters.price_max != null) p.set("price_max", String(Math.round(filters.price_max)));
  if (filters.in_stock) p.set("in_stock", "true");
  if (filters.occasion) p.set("occasion", filters.occasion);
  if (filters.material) p.set("material", filters.material);
  if (filters.rating === "4") p.set("rating", "4");

  const base = recipient ? `/for/${recipient}` : "/products";
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}
