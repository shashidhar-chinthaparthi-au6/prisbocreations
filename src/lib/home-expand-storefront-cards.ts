import type { StorefrontProductCard } from "@/lib/services/storefrontCatalog";

export type HomeListingRow = StorefrontProductCard & { rowKey: string };

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/**
 * Round-robin by product id so colour variants of one SKU are interleaved with other products
 * (avoids long runs of the same product). Deterministic for SSR.
 */
function interleaveByProductId(rows: HomeListingRow[]): HomeListingRow[] {
  if (rows.length <= 1) return rows;

  const queues = new Map<string, HomeListingRow[]>();
  for (const r of rows) {
    const id = r.id;
    const prev = queues.get(id);
    if (prev) prev.push(r);
    else queues.set(id, [r]);
  }

  const productOrder = [...queues.keys()].sort((a, b) => hashString(`ord:${a}`) - hashString(`ord:${b}`));

  const result: HomeListingRow[] = [];
  while (queues.size > 0) {
    let progressed = false;
    for (const pid of productOrder) {
      const q = queues.get(pid);
      if (!q?.length) continue;
      result.push(q.shift()!);
      progressed = true;
      if (!q.length) queues.delete(pid);
    }
    if (!progressed) break;
  }
  return result;
}

/** Expands multi-colour products into one row per colour, then interleaves rows so the same product does not appear consecutively when other products are present. */
export function expandHomeListingCardsByColour(cards: StorefrontProductCard[]): HomeListingRow[] {
  const out: HomeListingRow[] = [];
  for (const p of cards) {
    const slices = p.colorListingSlices;
    if (!slices || slices.length < 2) {
      out.push({ ...p, rowKey: p.id });
      continue;
    }
    for (const s of slices) {
      const { colorListingSlices: _cs, hoverImageUrl: _oldHover, ...base } = p;
      out.push({
        ...base,
        rowKey: `${p.id}_${s.key}`,
        listingColorKey: s.key,
        listingColorLabel: s.label,
        imageUrl: s.imageUrl,
        ...(s.hoverImageUrl ? { hoverImageUrl: s.hoverImageUrl } : {}),
      });
    }
  }
  return interleaveByProductId(out);
}
