"use client";

import { PrisboAssistantSidebar } from "@/components/storefront/PrisboAssistantSidebar";
import { StoreFooter } from "@/components/storefront/StoreFooter";
import { StoreShellHeaderBlock } from "@/components/storefront/StoreShellHeaderBlock";
import { useAssistantChatStore } from "@/lib/store/assistant-chat-store";

export function StoreShell({ children }: { children: React.ReactNode }) {
  const assistantSidebarOpen = useAssistantChatStore((s) => s.sidebarOpen);

  return (
    <div className="min-h-dvh bg-[var(--brand-canvas)] text-[var(--brand-ink)]">
      <StoreShellHeaderBlock />
      <div
        className={`transition-[margin] duration-300 ease-out will-change-[margin] ${
          assistantSidebarOpen
            ? "lg:mr-[min(420px,calc(100vw-env(safe-area-inset-right)-1px))]"
            : ""
        }`}
      >
        <main
          id="site-main-scroll"
          className="w-full px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] pt-[calc(var(--storefront-header-h,var(--listing-sticky-top))+0.375rem)] sm:px-6 sm:pb-8 sm:pt-[calc(var(--storefront-header-h,var(--listing-sticky-top))+0.625rem)] lg:pl-12 lg:pr-8 xl:pl-14"
        >
          {children}
        </main>
        <StoreFooter />
      </div>
      <PrisboAssistantSidebar />
    </div>
  );
}
