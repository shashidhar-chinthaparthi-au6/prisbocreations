"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatInrFromPaise } from "@/lib/format";
import { readRecentlyViewed, type RecentProduct } from "@/lib/recently-viewed";
import { StoreMedia } from "@/components/store/StoreMedia";

type Props = {
  /** Sit in a narrow column to the right of Featured (large screens). */
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
    return (
      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold leading-tight text-ink xl:text-lg">
          Recently viewed
        </h2>
        <ul className="flex max-h-[min(22rem,50vh)] flex-col gap-2 overflow-y-auto pr-0.5 [-ms-overflow-style:auto] [scrollbar-width:thin]">
          {rail.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/product/${p.slug}`}
                className="group flex gap-2 rounded-lg border border-sand-deep bg-white p-1.5 shadow-sm transition hover:border-accent"
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
                  <p className="line-clamp-2 text-[11px] font-medium leading-snug text-ink group-hover:text-accent">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-ink">
                    {formatInrFromPaise(p.pricePaise)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg text-ink md:text-xl">Recently viewed</h2>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:pb-0 lg:grid-cols-6">
        {items.map((p) => (
          <Link
            key={p.slug}
            href={`/product/${p.slug}`}
            className="group w-[30vw] max-w-[7rem] shrink-0 overflow-hidden rounded-lg border border-sand-deep bg-white shadow-sm transition hover:border-accent sm:w-28 md:max-w-none"
          >
            <div className="relative aspect-square w-full bg-sand-deep">
              {p.image ? (
                <StoreMedia
                  src={p.image}
                  alt={p.name}
                  fill
                  eager
                  className="object-cover"
                  sizes="(max-width:768px) 30vw, 112px"
                />
              ) : null}
            </div>
            <div className="p-1.5">
              <p className="line-clamp-2 text-[11px] font-medium leading-tight text-ink group-hover:text-accent">
                {p.name}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-ink">
                {formatInrFromPaise(p.pricePaise)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
