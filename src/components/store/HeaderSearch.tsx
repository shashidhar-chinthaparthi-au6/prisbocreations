"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchSuggestInput } from "@/components/store/SearchSuggestInput";

/** Static shell while search params stream (Suspense fallback). */
export function HeaderSearchFallback() {
  return (
    <div
      className="h-11 w-full max-w-xl rounded-md border border-slate-200 bg-slate-50 sm:h-12 sm:max-w-2xl md:max-w-3xl lg:max-w-4xl"
      aria-hidden
    />
  );
}

function HeaderSearchInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const syncedQ = pathname === "/search" ? (searchParams.get("q") ?? "") : "";
  const [cacheBust, setCacheBust] = useState(0);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setCacheBust((n) => n + 1);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const inputKey =
    pathname === "/search" ? `sq:${syncedQ}:${cacheBust}` : `${pathname}:${cacheBust}`;

  return (
    <form
      action="/search"
      method="get"
      autoComplete="off"
      className="flex w-full max-w-xl justify-center sm:max-w-2xl md:max-w-3xl lg:max-w-4xl"
      role="search"
    >
      <label htmlFor="header-search" className="sr-only">
        Search products
      </label>
      <SearchSuggestInput
        key={inputKey}
        id="header-search"
        variant="header"
        className="w-full"
        defaultValue={syncedQ}
        placeholder="Search products…"
      />
    </form>
  );
}

export function HeaderSearch() {
  return <HeaderSearchInner />;
}
