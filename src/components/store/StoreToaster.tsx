"use client";

import { useEffect, useState } from "react";

type Item = {
  id: number;
  message: string;
  duration: number;
  variant?: "default" | "wishlist";
  actionLabel?: string;
  onAction?: () => void;
};

export function StoreToaster() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const ce = e as CustomEvent<{
        message?: string;
        duration?: number;
        actionLabel?: string;
        onAction?: () => void;
        variant?: "default" | "wishlist";
      }>;
      const message = ce.detail?.message?.trim();
      if (!message) return;
      const id = Date.now() + Math.random();
      const duration = typeof ce.detail?.duration === "number" && ce.detail.duration > 0 ? ce.detail.duration : 3000;
      const actionLabel = ce.detail?.actionLabel?.trim();
      const onAction = ce.detail?.onAction;
      const variant = ce.detail?.variant === "wishlist" ? "wishlist" : "default";
      setItems((prev) => [...prev, { id, message, duration, variant, actionLabel, onAction }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    window.addEventListener("prisbo:toast", onToast);
    return () => window.removeEventListener("prisbo:toast", onToast);
  }, []);

  if (!items.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 left-4 z-[300] flex max-w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={
            t.variant === "wishlist"
              ? "pointer-events-auto flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[#E8E0D6] border-l-[4px] border-l-[#C47A2B] bg-white px-4 py-3 text-sm text-[#44403C] shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
              : "pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E8E0D6] bg-[#F5F5F4] px-4 py-3 text-sm text-[#44403C] shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
          }
        >
          <span className={t.variant === "wishlist" ? "whitespace-pre-line" : ""}>{t.message}</span>
          {t.actionLabel && t.onAction ? (
            <button
              type="button"
              className="shrink-0 font-semibold text-[#C47A2B] hover:underline"
              onClick={() => {
                t.onAction?.();
                setItems((prev) => prev.filter((x) => x.id !== t.id));
              }}
            >
              {t.actionLabel}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function dispatchStoreToast(
  message: string,
  opts?: {
    duration?: number;
    actionLabel?: string;
    onAction?: () => void;
    variant?: "default" | "wishlist";
  },
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("prisbo:toast", { detail: { message, ...opts } }),
  );
}
