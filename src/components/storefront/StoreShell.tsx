"use client";

import { StoreFooter } from "@/components/storefront/StoreFooter";
import { StoreShellHeaderBlock } from "@/components/storefront/StoreShellHeaderBlock";

export function StoreShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--brand-canvas)] text-[var(--brand-ink)]">
      <StoreShellHeaderBlock />
      <main
        id="site-main-scroll"
        className="w-full px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] pt-[calc(var(--storefront-header-h,var(--listing-sticky-top))+0.375rem)] sm:px-6 sm:pb-8 sm:pt-[calc(var(--storefront-header-h,var(--listing-sticky-top))+0.625rem)] lg:px-10"
      >
        {children}
      </main>
      <StoreFooter />
    </div>
  );
}
