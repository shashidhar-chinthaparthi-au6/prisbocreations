"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatInrFromPaise } from "@/lib/format";
import { readRecentlyViewed, type RecentProduct } from "@/lib/recently-viewed";
import { StoreMedia } from "@/components/store/StoreMedia";

type Props = {
  /** Narrow right column beside main home content (large screens). */
  sidebar?: boolean;
};

export function RecentlyViewedHome({ sidebar = false }: Props) {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    setItems(readRecentlyViewed());
  }, []);

  if (!items.length) return null;

  if (sidebar) {
    const rail = items.slice(0, 8);
    const inner = (
      <>
        <h2 className="font-display text-base font-semibold leading-tight text-ink xl:text-lg">
          Recently viewed
        </h2>
        <ul className="mt-2.5 flex max-h-[min(24rem,52vh)] flex-col gap-2 overflow-y-auto pr-0.5 [-ms-overflow-style:auto] [scrollbar-width:thin]">
          {rail.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/product/${p.slug}`}
                className="group flex gap-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm transition hover:border-accent"
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-sand-deep sm:h-12 sm:w-12">
                  {p.image ? (
                    <StoreMedia
                      src={p.image}
                      alt={p.name}
                      fill
                      eager
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="line-clamp-2 text-[11px] font-medium leading-snug text-ink group-hover:text-accent sm:text-xs">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-ink sm:text-[11px]">
                    {formatInrFromPaise(p.pricePaise)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </>
    );

    return (
      <div className="w-full shrink-0 border-sand-deep/70 lg:w-[12.75rem] lg:border-l lg:pl-5 xl:w-[13.5rem] xl:pl-6">
        <div className="lg:sticky lg:top-24">{inner}</div>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-base text-ink md:text-lg">Recently viewed</h2>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:gap-2 md:overflow-visible md:pb-0 lg:grid-cols-6">
        {items.map((p) => (
          <Link
            key={p.slug}
            href={`/product/${p.slug}`}
            className="group w-[26vw] max-w-[5.75rem] shrink-0 overflow-hidden rounded-md border border-sand-deep bg-white shadow-sm transition hover:border-accent sm:w-24 md:max-w-none"
          >
            <div className="relative aspect-square w-full bg-sand-deep">
              {p.image ? (
                <StoreMedia
                  src={p.image}
                  alt={p.name}
                  fill
                  eager
                  className="object-cover"
                  sizes="(max-width:768px) 26vw, 96px"
                />
              ) : null}
            </div>
            <div className="p-1">
              <p className="line-clamp-2 text-[10px] font-medium leading-tight text-ink group-hover:text-accent">
                {p.name}
              </p>
              <p className="mt-0.5 text-[9px] font-semibold tabular-nums text-ink">
                {formatInrFromPaise(p.pricePaise)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
