"use client";

import { StoreAnnouncementBar } from "@/components/storefront/StoreAnnouncementBar";
import { StoreFooter } from "@/components/storefront/StoreFooter";
import { StoreHeader } from "@/components/storefront/StoreHeader";

export function StoreShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--brand-surface)] text-[var(--brand-ink)]">
      <div className="sticky top-0 z-[100] pt-[env(safe-area-inset-top)]">
        <StoreAnnouncementBar />
        <StoreHeader />
      </div>
      <main
        id="site-main-scroll"
        className="min-h-0 flex-1 px-[max(1rem,env(safe-area-inset-left))] py-6 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-10"
      >
        {children}
      </main>
      <StoreFooter />
    </div>
  );
}
