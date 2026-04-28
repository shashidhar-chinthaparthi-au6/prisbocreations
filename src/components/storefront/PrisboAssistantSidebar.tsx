"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { PrisboAssistantChat } from "@/components/storefront/PrisboAssistantChat";
import { useAssistantChatStore } from "@/lib/store/assistant-chat-store";

/** Drawer width mirrors margin on main/footer when sidebar open (desktop). */
const ASSISTANT_WIDTH_STYLE = "min(420px,calc(100vw - env(safe-area-inset-right) - 1px))" as const;

/**
 * Slide-over from viewport top–right; full viewport height so chat fills with scroll.
 */
export function PrisboAssistantSidebar() {
  const open = useAssistantChatStore((s) => s.sidebarOpen);
  const setOpen = useAssistantChatStore((s) => s.setSidebarOpen);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[225] flex justify-end overscroll-none">
      {/* No backdrop blur — left storefront stays readable. Desktop: clickable strip left of drawer; mobile: full translucent tap areas */}
      <button
        type="button"
        aria-label="Close assistant"
        className="pointer-events-auto absolute inset-0 bg-black/[0.07] lg:inset-auto lg:bottom-0 lg:left-0 lg:top-0 lg:right-[min(420px,calc(100vw-env(safe-area-inset-right)-1px))] lg:bg-transparent"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Prisbo Assistant"
        className="pointer-events-auto absolute bottom-0 right-0 top-0 flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col animate-in slide-in-from-right duration-300 ease-out border-l border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-[-14px_0_48px_-12px_rgba(26,26,26,0.18)]"
        style={{ width: ASSISTANT_WIDTH_STYLE }}
      >
        <PrisboAssistantChat
          variant="sidebar"
          onClose={() => setOpen(false)}
          onAfterApplyProducts={() => setOpen(false)}
        />
      </div>
    </div>,
    document.body,
  );
}
