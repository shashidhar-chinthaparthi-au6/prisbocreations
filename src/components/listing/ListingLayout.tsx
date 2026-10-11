"use client";

import { type ReactNode } from "react";

/** Full-width storefront listing. Filters sit above the grid. */
export function ListingLayout({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="listing-page-shell editorial relative z-[1]">
      <div className="min-w-0 w-full">{sidebar}</div>
      <div className="min-w-0 w-full flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
