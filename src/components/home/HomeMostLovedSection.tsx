"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { StorefrontProductCard } from "@/lib/services/storefrontCatalog";

export function HomeMostLovedSection({ initial }: { initial: StorefrontProductCard[] }) {
  const [active, setActive] = useState<string | null>(null);

  const pills = useMemo(() => {
    const names = new Set<string>();
    for (const item of initial) {
      const name = item.subcategoryName?.trim();
      if (name) names.add(name);
    }
    return [...names].slice(0, 8);
  }, [initial]);

  const shown = useMemo(() => {
    const rows = active ? initial.filter((item) => item.subcategoryName === active) : initial;
    return rows.slice(0, 8);
  }, [active, initial]);

  const pieceLabel = `${shown.length} ${shown.length === 1 ? "piece" : "pieces"}`;
  const pill =
    "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[14px] transition-colors";

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-4 border-b border-[#e6e1d8] pb-3">
        <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActive(null)}
            className={`${pill} ${active == null ? "bg-[#1c1612] text-[#f7f4ee]" : "px-2 text-[#1c1612]/70 hover:text-[#1c1612]"}`}
          >
            All pieces
          </button>
          {pills.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActive(name)}
              className={`${pill} ${active === name ? "bg-[#1c1612] text-[#f7f4ee]" : "px-2 text-[#1c1612]/70 hover:text-[#1c1612]"}`}
            >
              {name}
            </button>
          ))}
        </div>
        <p className="shrink-0 text-[13px] tabular-nums text-[#1c1612]/45">{pieceLabel}</p>
      </div>

      <div className="product-grid mt-8">
        {shown.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>

      <div className="mt-8 md:hidden">
        <Link href="/bulk" className="text-[13px] text-[#1c1612]/70">
          Need something custom? <span aria-hidden>↗</span>
        </Link>
      </div>
    </div>
  );
}
