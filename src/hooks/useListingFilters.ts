"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";

export function useListingFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const setFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }, [pathname, router]);

  return {
    setFilter,
    setFilters,
    clearAll,
    isPending,
    searchParams,
    /** Spec aliases */
    set: setFilter,
    clear: clearAll,
    params: searchParams,
  };
}
