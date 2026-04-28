"use client";

import { useLayoutEffect, useRef } from "react";
import { StoreAnnouncementBar } from "@/components/storefront/StoreAnnouncementBar";
import { StoreHeader } from "@/components/storefront/StoreHeader";
import { useAssistantChatStore } from "@/lib/store/assistant-chat-store";

const HEADER_H_VAR = "--storefront-header-h";

/**
 * Pinned storefront chrome (announcement + nav). Publishes total height in CSS px as
 * `--storefront-header-h` for main padding and listing filter `top` alignment.
 * When the assistant sidebar is open on large screens, the bar uses the same right
 * edge as the main column so it stays aligned with page content.
 */
export function StoreShellHeaderBlock() {
  const ref = useRef<HTMLDivElement>(null);
  const assistantSidebarOpen = useAssistantChatStore((s) => s.sidebarOpen);

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
  }, [assistantSidebarOpen]);

  return (
    <div
      ref={ref}
      className={`fixed left-0 top-0 z-[100] pt-[env(safe-area-inset-top)] transition-[right] duration-300 ease-out will-change-[right] right-0 ${
        assistantSidebarOpen
          ? "lg:right-[min(420px,calc(100vw-env(safe-area-inset-right)-1px))]"
          : ""
      }`}
    >
      <StoreAnnouncementBar />
      <StoreHeader />
    </div>
  );
}
