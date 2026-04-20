"use client";

import { ProductsSortBar } from "@/components/storefront/ProductsSortBar";

type Props = {
  title: string;
  subtitle?: string;
  showing: number;
  total: number;
};

export function ListingTopbar({ title, subtitle, showing, total }: Props) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-sm font-normal text-[var(--ink)] md:text-2xl lg:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-[var(--muted)] md:mt-1 md:text-sm">{subtitle}</p>
        ) : null}
        <p className="mt-0.5 text-[10px] text-[var(--muted)] md:mt-1 md:text-sm">
          Showing {showing} of {total} products
        </p>
      </div>
      <div className="w-full min-w-0 shrink-0 md:max-w-[220px]">
        <div className="[&_select]:text-[10px] md:[&_select]:text-sm">
          <ProductsSortBar />
        </div>
      </div>
    </div>
  );
}
