"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatInrFromPaise } from "@/lib/format";
import { bandCaption, tierHeading } from "@/lib/bulk/offer";
import { BULK_ENQUIRY_MIN } from "@/lib/bulk/pricing";
import type { BulkCatalogueItem } from "@/lib/bulk/catalogue";

function Photo({ src, alt }: { src?: string; alt: string }) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--brand-amber-light)] font-display text-2xl text-[var(--brand-amber-dark)]">
        {alt.slice(0, 1)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      onError={() => setOk(false)}
    />
  );
}

export function BulkCatalogueBrowser({ items }: { items: BulkCatalogueItem[] }) {
  const categories = useMemo(() => {
    const names = [...new Set(items.map((item) => item.category))];
    names.sort((a, b) => a.localeCompare(b, "en"));
    return names;
  }, [items]);
  const [category, setCategory] = useState("All");
  const shown = category === "All" ? items : items.filter((item) => item.category === category);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-[var(--brand-border)] bg-white px-5 py-8 text-sm text-[var(--brand-muted)]">
        The catalogue is being updated. Send an enquiry and we will price the pieces you need.
      </p>
    );
  }

  return (
    <div>
      {categories.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Catalogue categories">
          {["All", ...categories].map((name) => {
            const active = name === category;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(name)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--brand-ink)] text-white"
                    : "border border-[var(--brand-border)] bg-white text-[var(--brand-ink)] hover:border-[var(--brand-amber)]"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      ) : null}

      <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {shown.map((item) => {
          const name = item.slug ? (
            <Link href={`/products/${item.slug}`} className="hover:text-[var(--brand-amber-dark)]">
              {item.name}
            </Link>
          ) : (
            item.name
          );
          return (
            <li
              key={item.id}
              className="overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-white"
            >
              <div className="flex gap-4 p-4">
                <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--brand-amber-light)]">
                  <Photo src={item.imageUrl} alt={item.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-amber)]">
                    {item.band ? bandCaption(item.band) : "Quoted per run"}
                  </p>
                  <h3 className="mt-1 font-display text-xl leading-tight text-[var(--brand-ink)]">{name}</h3>
                  {item.summary ? (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--brand-muted)]">{item.summary}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-[var(--brand-muted)]">
                    Shop price {formatInrFromPaise(item.retailPaise)}
                    {item.moq ? ` · Minimum ${item.moq}` : ` · Enquire from ${BULK_ENQUIRY_MIN}`}
                    {item.leadTime ? ` · ${item.leadTime} in the studio` : ""}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-4 border-t border-[var(--brand-border)]">
                {item.tiers.map((tier) => (
                  <div key={tier.qty} className="px-3 py-3 text-center">
                    <dt className="text-[11px] uppercase tracking-wide text-[var(--brand-muted)]">
                      {tierHeading(tier.qty)}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--brand-ink)]">
                      {tier.unitPaise == null ? "Quote" : formatInrFromPaise(tier.unitPaise)}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
