import type { NavCategoryTreeItem } from "@/lib/services/catalogService";
import type { SubcategoryFilterSpec, ValidatedListingFilters } from "@/lib/storefront-assistant-filters";

type FlatSub = {
  slug: string;
  parentSlug: string;
  parentNameLc: string;
  nameLc: string;
  slugLc: string;
};

function flattenSubs(tree: NavCategoryTreeItem[]): FlatSub[] {
  const out: FlatSub[] = [];
  for (const c of tree) {
    const parentNameLc = c.name.toLowerCase();
    for (const s of c.subcategories) {
      out.push({
        slug: s.slug,
        parentSlug: c.slug,
        parentNameLc,
        nameLc: s.name.toLowerCase(),
        slugLc: s.slug.toLowerCase(),
      });
    }
  }
  return out;
}

export type ShoppingIntent = "mug" | "shirt_tops";

function detectShoppingIntents(userText: string): ShoppingIntent[] {
  const t = userText.toLowerCase();
  const out: ShoppingIntent[] = [];
  if (/\b(mug|mugs|coffee\s+cup|coffee\s+cups|tea\s+cup|tea\s+cups|sipper)\b/.test(t)) {
    out.push("mug");
  }
  if (
    /\b(t[\s'-]*shirts?|tees?\b|polo\s+shirt|graphic\s+tee|round\s+neck\s+t|round\s+neck\s+tee)\b/.test(t) ||
    (/\bshirts?\b/.test(t) && !/\bhoodie(s)?\b/.test(t))
  ) {
    out.push("shirt_tops");
  }
  return [...new Set(out)];
}

function scoreMug(fs: FlatSub): number {
  let s = 0;
  const pack = `${fs.nameLc} ${fs.slugLc}`;
  if (/\bmug/.test(fs.slugLc) || /\bmug/.test(fs.nameLc)) s += 85;
  if (/\bcup/.test(fs.nameLc) && /\bmug|sip|sipper|coffee|tea/.test(pack)) s += 35;
  if (/\bsip|sipper|sip\b/.test(pack)) s += 40;
  if (/\bcoffee|tea\b/.test(pack) && /\bmug|cup|sip/.test(pack)) s += 25;
  if (/\bacrylic|resin|laser|led|plaque|standee|keychain|coaster\b/.test(pack) && !/\bmug|cup|sip|drink|sipper|coffee|tea\b/.test(pack)) {
    s -= 120;
  }
  return s;
}

function scoreShirtTops(fs: FlatSub): number {
  let s = 0;
  const pack = `${fs.nameLc} ${fs.slugLc}`;
  if (/\b(t[\s'-]*shirt|tee|tees|polo|pullover|hoodie|sweatshirt|apparel|garment|garments)\b/.test(pack)) s += 70;
  if (/\bshirt\b/.test(fs.nameLc) || /\bshirt/.test(fs.slugLc)) s += 55;
  if (/\bmug|coaster|plaque|keychain|sipper\b/.test(pack) && !/\bshirt|tee|polo|hoodie|apparel\b/.test(pack)) s -= 80;
  return s;
}

const MIN_SCORE = 28;

function bestSubForIntent(
  flat: FlatSub[],
  intent: ShoppingIntent,
): { slug: string; category: string } | null {
  let best: { slug: string; category: string; score: number } | null = null;
  for (const fs of flat) {
    const score =
      intent === "mug" ? scoreMug(fs) : intent === "shirt_tops" ? scoreShirtTops(fs) : 0;
    if (score < MIN_SCORE) continue;
    if (!best || score > best.score) best = { slug: fs.slug, category: fs.parentSlug, score };
  }
  return best ? { slug: best.slug, category: best.category } : null;
}

/**
 * Prefer catalogue subcategories that match what the shopper said, and prune broad parent-category
 * guesses when they aren't parents of the resolved subs.
 */
export function refineAssistantFiltersFromUserMessage(
  tree: NavCategoryTreeItem[],
  validated: ValidatedListingFilters | null,
  lastUserMessage: string,
): ValidatedListingFilters | null {
  const intents = detectShoppingIntents(lastUserMessage);
  if (!intents.length) return validated;

  const flat = flattenSubs(tree);
  const resolved: SubcategoryFilterSpec[] = [];
  for (const it of intents) {
    const b = bestSubForIntent(flat, it);
    if (b) resolved.push(b);
  }
  if (!resolved.length) return validated;

  const existing = [...(validated?.subcategories ?? [])];
  const seen = new Set(existing.map((e) => e.slug.toLowerCase()));
  for (const r of resolved) {
    if (!seen.has(r.slug.toLowerCase())) {
      existing.push(r);
      seen.add(r.slug.toLowerCase());
    }
  }

  const merged: ValidatedListingFilters = validated ? { ...validated } : {};
  merged.subcategories = existing;

  const parentSet = new Set(existing.map((e) => e.category).filter(Boolean) as string[]);
  if (merged.categories?.length) {
    merged.categories = merged.categories.filter((c) => parentSet.has(c));
    if (!merged.categories.length) delete merged.categories;
  }

  if (
    !merged.q &&
    !merged.categories?.length &&
    !merged.subcategories?.length &&
    !merged.recipient &&
    !merged.sort &&
    merged.price_min === undefined &&
    merged.price_max === undefined &&
    merged.in_stock === undefined &&
    !merged.occasion &&
    !merged.material &&
    !merged.rating
  ) {
    return null;
  }

  return merged;
}

function findSubDisplayName(tree: NavCategoryTreeItem[], spec: SubcategoryFilterSpec): string {
  if (spec.category) {
    const cat = tree.find((c) => c.slug === spec.category);
    const hit = cat?.subcategories.find((s) => s.slug === spec.slug);
    if (hit) return hit.name;
  }
  for (const c of tree) {
    const hit = c.subcategories.find((s) => s.slug === spec.slug);
    if (hit) return hit.name;
  }
  return spec.slug;
}

function findCategoryDisplayName(tree: NavCategoryTreeItem[], slug: string): string {
  return tree.find((c) => c.slug === slug)?.name ?? slug;
}

/** Human-readable line for the assistant UI. */
export function buildAssistantFilterSummaryLabel(
  tree: NavCategoryTreeItem[],
  filters: ValidatedListingFilters | null,
): string | null {
  if (!filters) return null;
  const parts: string[] = [];
  for (const s of filters.subcategories ?? []) {
    parts.push(findSubDisplayName(tree, s));
  }
  for (const c of filters.categories ?? []) {
    parts.push(findCategoryDisplayName(tree, c));
  }
  if (filters.q?.trim()) parts.push(`“${filters.q.trim().slice(0, 80)}${filters.q.trim().length > 80 ? "…" : ""}”`);

  const uniq = [...new Set(parts)].filter(Boolean);
  return uniq.length ? uniq.join(" · ") : null;
}
