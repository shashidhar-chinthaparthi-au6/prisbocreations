"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { NavCategoryTreeItem } from "@/lib/services/catalogService";

const ALL_SLUG = "__all__";

type Props = {
  categories: NavCategoryTreeItem[];
};

type PanelPos = { top: number; left: number; minWidth: number; maxWidth: number };

export function StoreCategoryNav({ categories }: Props) {
  const pathname = usePathname();
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [canHover, setCanHover] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current != null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => setOpenSlug(null), 140);
  }, [cancelScheduledClose]);

  const updatePanelPosition = useCallback((slug: string) => {
    const el = triggerRefs.current[slug];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const isAll = slug === ALL_SLUG;
    const maxWidth = isAll ? Math.min(560, vw - 16) : Math.min(352, vw - 16);
    const minWidth = isAll ? Math.min(Math.max(r.width, 280), maxWidth) : Math.max(r.width, 14 * 16);
    setPanelPos({
      top: r.bottom + 4,
      left: r.left,
      minWidth: Math.min(minWidth, maxWidth),
      maxWidth,
    });
  }, []);

  useLayoutEffect(() => {
    if (!openSlug || !mounted) {
      setPanelPos(null);
      return;
    }
    updatePanelPosition(openSlug);

    function onScrollOrResize() {
      if (openSlug) updatePanelPosition(openSlug);
    }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    const main = document.getElementById("site-main-scroll");
    main?.addEventListener("scroll", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      main?.removeEventListener("scroll", onScrollOrResize);
    };
  }, [openSlug, mounted, updatePanelPosition]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cancelScheduledClose();
        setOpenSlug(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cancelScheduledClose]);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (navRef.current?.contains(t)) return;
      const panel = document.getElementById("store-category-dropdown-panel");
      if (panel?.contains(t)) return;
      setOpenSlug(null);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

  const close = useCallback(() => {
    cancelScheduledClose();
    setOpenSlug(null);
  }, [cancelScheduledClose]);

  const openCategory = useCallback(
    (slug: string) => {
      cancelScheduledClose();
      setOpenSlug(slug);
      requestAnimationFrame(() => updatePanelPosition(slug));
    },
    [cancelScheduledClose, updatePanelPosition],
  );

  const activeCategory = categories.find((c) => c.slug === openSlug);
  const isAllOpen = openSlug === ALL_SLUG;

  const showSinglePanel =
    mounted &&
    openSlug &&
    !isAllOpen &&
    activeCategory &&
    activeCategory.subcategories.length > 0 &&
    panelPos;

  const showAllPanel =
    mounted && isAllOpen && panelPos && categories.length > 0;

  const clampedLeft =
    panelPos && typeof window !== "undefined"
      ? Math.max(
          8,
          Math.min(panelPos.left, window.innerWidth - panelPos.maxWidth - 8),
        )
      : 0;

  const dropdown =
    showSinglePanel && panelPos && activeCategory ? (
      <div
        id="store-category-dropdown-panel"
        role="menu"
        className="fixed z-[100] rounded-md border border-slate-200 bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
        style={{
          top: panelPos.top,
          left: clampedLeft,
          minWidth: panelPos.minWidth,
          maxWidth: panelPos.maxWidth,
        }}
        onMouseEnter={() => {
          cancelScheduledClose();
          if (openSlug) updatePanelPosition(openSlug);
        }}
        onMouseLeave={() => {
          if (canHover) scheduleClose();
        }}
      >
        <ul className="max-h-[min(70vh,22rem)] overflow-y-auto">
          {activeCategory.subcategories.map((s) => (
            <li key={s.slug} role="none">
              <Link
                role="menuitem"
                href={`/category/${activeCategory.slug}/${s.slug}`}
                className="block px-3 py-2.5 text-sm text-slate-800 transition hover:bg-slate-50"
                onClick={close}
              >
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="border-t border-slate-100">
          <Link
            href={`/category/${activeCategory.slug}`}
            className="block px-3 py-2.5 text-xs font-semibold text-accent hover:bg-amber-50/80"
            onClick={close}
          >
            View all in {activeCategory.name}
          </Link>
        </div>
      </div>
    ) : showAllPanel && panelPos ? (
      <div
        id="store-category-dropdown-panel"
        role="menu"
        className="fixed z-[100] rounded-md border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
        style={{
          top: panelPos.top,
          left: clampedLeft,
          width: panelPos.maxWidth,
          maxWidth: panelPos.maxWidth,
        }}
        onMouseEnter={() => {
          cancelScheduledClose();
          updatePanelPosition(ALL_SLUG);
        }}
        onMouseLeave={() => {
          if (canHover) scheduleClose();
        }}
      >
        <div className="max-h-[min(75vh,32rem)] overflow-y-auto px-1 py-2 sm:px-2">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4">
            {categories.map((c) => (
              <div key={c.slug} className="min-w-0 border-b border-slate-100 pb-3 last:border-0 sm:border-0 sm:pb-0">
                <Link
                  href={`/category/${c.slug}`}
                  className="block px-2 py-1 text-sm font-semibold text-slate-900 hover:text-accent"
                  onClick={close}
                >
                  {c.name}
                </Link>
                {c.subcategories.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 pl-1">
                    {c.subcategories.map((s) => (
                      <li key={s.slug}>
                        <Link
                          href={`/category/${c.slug}/${s.slug}`}
                          className="block rounded px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          onClick={close}
                        >
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100">
          <Link
            href="/categories"
            className="block px-4 py-3 text-center text-xs font-semibold text-accent hover:bg-amber-50/80"
            onClick={close}
          >
            Browse all categories
          </Link>
        </div>
      </div>
    ) : null;

  /** Accent underline on “All” when on /categories or the mega menu is open */
  const allTabHighlight = isAllOpen || pathname === "/categories";

  return (
    <nav
      ref={navRef}
      className="w-full min-w-0 border-t border-slate-100 bg-white"
      aria-label="Shop by category"
    >
      <div className="flex w-full min-w-0 flex-row flex-nowrap items-stretch gap-0 overflow-x-auto overflow-y-visible overscroll-x-contain px-[max(0.75rem,env(safe-area-inset-left))] py-2 pr-[max(0.75rem,env(safe-area-inset-right))] [-ms-overflow-style:none] [scrollbar-width:none] sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] lg:px-8 [&::-webkit-scrollbar]:hidden">
        <div
          ref={(el) => {
            triggerRefs.current[ALL_SLUG] = el;
          }}
          className="relative shrink-0"
          onMouseEnter={() => {
            if (canHover && categories.length > 0) openCategory(ALL_SLUG);
          }}
          onMouseLeave={() => {
            if (canHover) scheduleClose();
          }}
        >
          <Link
            href="/categories"
            className={
              allTabHighlight
                ? "inline-flex h-full min-h-[2.5rem] shrink-0 items-center whitespace-nowrap border-b-2 border-accent px-2.5 py-1.5 text-xs font-semibold text-slate-900 sm:min-h-[2.75rem] sm:px-3 sm:text-sm"
                : "inline-flex h-full min-h-[2.5rem] shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:min-h-[2.75rem] sm:px-3 sm:text-sm"
            }
            aria-expanded={categories.length > 0 ? isAllOpen : undefined}
            aria-haspopup={categories.length > 0 ? "menu" : undefined}
            onClick={(e) => {
              if (!categories.length || canHover) return;
              e.preventDefault();
              setOpenSlug((prev) => (prev === ALL_SLUG ? null : ALL_SLUG));
            }}
          >
            All
          </Link>
        </div>

        {categories.map((c) => {
          const hasSubs = c.subcategories.length > 0;
          const isOpen = openSlug === c.slug;
          const catPath = `/category/${c.slug}`;
          const catActive =
            pathname === catPath || pathname.startsWith(`${catPath}/`);

          return (
            <div
              key={c.slug}
              ref={(el) => {
                triggerRefs.current[c.slug] = el;
              }}
              className="relative shrink-0"
              onMouseEnter={() => {
                if (canHover && hasSubs) openCategory(c.slug);
              }}
              onMouseLeave={() => {
                if (canHover) scheduleClose();
              }}
            >
              <Link
                href={catPath}
                className={
                  isOpen || catActive
                    ? "inline-flex h-full min-h-[2.5rem] shrink-0 items-center justify-center whitespace-nowrap border-b-2 border-accent px-2.5 py-1.5 text-center text-xs font-semibold text-slate-900 sm:min-h-[2.75rem] sm:px-3 sm:text-sm"
                    : "inline-flex h-full min-h-[2.5rem] shrink-0 items-center justify-center whitespace-nowrap border-b-2 border-transparent px-2.5 py-1.5 text-center text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:min-h-[2.75rem] sm:px-3 sm:text-sm"
                }
                aria-expanded={hasSubs ? isOpen : undefined}
                aria-haspopup={hasSubs ? "menu" : undefined}
                onClick={(e) => {
                  if (!hasSubs || canHover) return;
                  e.preventDefault();
                  setOpenSlug((prev) => (prev === c.slug ? null : c.slug));
                }}
              >
                {c.name}
              </Link>
            </div>
          );
        })}
      </div>
      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </nav>
  );
}
