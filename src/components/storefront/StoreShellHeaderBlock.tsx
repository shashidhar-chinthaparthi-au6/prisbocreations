"use client";

import { useLayoutEffect, useRef } from "react";
import { StoreAnnouncementBar } from "@/components/storefront/StoreAnnouncementBar";
import { StoreHeader } from "@/components/storefront/StoreHeader";

const HEADER_H_VAR = "--storefront-header-h";

/**
 * Pinned storefront chrome (announcement + nav). Publishes total height in CSS px as
 * `--storefront-header-h` for main padding and listing filter `top` alignment.
 */
export function StoreShellHeaderBlock() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const setVar = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty(HEADER_H_VAR, `${h}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty(HEADER_H_VAR);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 top-0 z-[100] w-full pt-[env(safe-area-inset-top)]"
    >
      <StoreAnnouncementBar />
      <StoreHeader />
    </div>
  );
}
