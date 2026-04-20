import type { ReactNode } from "react";

/**
 * Listing shell: persistent left filter column + main (all breakpoints — no mobile bottom sheet).
 */
export function ListingLayout({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="listing-page-shell">
      {sidebar}
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
