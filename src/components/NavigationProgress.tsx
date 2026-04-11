"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top bar when the route changes (App Router client navigations).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  const first = useRef(true);
  const search = searchParams.toString();

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 550);
    return () => window.clearTimeout(t);
  }, [pathname, search]);

  return (
    <div
      className={`pointer-events-none fixed left-0 top-0 z-[100] h-0.5 w-full bg-transparent transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden
    >
      <div
        className={`h-full bg-accent shadow-sm transition-all duration-500 ease-out ${
          show ? "w-full" : "w-0"
        }`}
      />
    </div>
  );
}
