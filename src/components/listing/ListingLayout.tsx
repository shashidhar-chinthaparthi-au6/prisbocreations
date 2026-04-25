"use client";

import { type ReactNode, useCallback, useLayoutEffect, useRef } from "react";

const FILTER_LEFT_VAR = "--filter-aside-left";
const FILTER_RAIL_W_VAR = "--filter-rail-w";

/**
 * Storefront listing: filters above the grid on small screens. From `lg` up, a spacer keeps
 * layout width; the filter panel uses `position: fixed` with `left` measured from the spacer
 * so it stays in view and aligns on every page (varying main padding / full-bleed gutters).
 */
export function ListingLayout({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const spacerRef = useRef<HTMLDivElement>(null);

  const syncFilterRail = useCallback(() => {
    const el = spacerRef.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      document.documentElement.style.removeProperty(FILTER_LEFT_VAR);
      document.documentElement.style.removeProperty(FILTER_RAIL_W_VAR);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width < 1) {
      document.documentElement.style.removeProperty(FILTER_LEFT_VAR);
      document.documentElement.style.removeProperty(FILTER_RAIL_W_VAR);
      return;
    }
    const left = Math.round(r.left);
    const railW = Math.round(r.right);
    document.documentElement.style.setProperty(FILTER_LEFT_VAR, `${left}px`);
    /* Full-width strip from viewport x=0 to the start of the product column */
    document.documentElement.style.setProperty(FILTER_RAIL_W_VAR, `${railW}px`);
  }, []);

  useLayoutEffect(() => {
    const el = spacerRef.current;
    if (!el) return;

    syncFilterRail();
    const ro = new ResizeObserver(() => {
      syncFilterRail();
    });
    ro.observe(el);
    window.addEventListener("resize", syncFilterRail);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncFilterRail);
      document.documentElement.style.removeProperty(FILTER_LEFT_VAR);
      document.documentElement.style.removeProperty(FILTER_RAIL_W_VAR);
    };
  }, [syncFilterRail]);

  return (
    <div className="listing-page-shell relative z-[1]">
      <div
        className="filter-rail-backdrop store-rail-bg max-lg:hidden"
        aria-hidden
      />
      <div
        ref={spacerRef}
        className="hidden shrink-0 lg:block lg:w-[270px] xl:w-[300px]"
        aria-hidden
      />
      <div className="min-w-0 w-full max-lg:contents lg:block lg:w-0 lg:max-w-0 lg:shrink-0 lg:overflow-visible">
        {sidebar}
      </div>
      <div className="min-w-0 w-full flex-1 min-h-0 overflow-x-hidden lg:min-w-0">{children}</div>
    </div>
  );
}
