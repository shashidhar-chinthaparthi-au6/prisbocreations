"use client";

import Link from "next/link";
import { PrisboAssistantChat } from "@/components/storefront/PrisboAssistantChat";

/** Full-page conversational shopping experience (same thread as sidebar). */
export function AssistantPageClient() {
  return (
    <div id="assistant-page" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-16 pt-[calc(var(--storefront-header-h,var(--listing-sticky-top))+1.25rem)] sm:gap-8 sm:px-6 lg:max-w-[46rem]">
      <nav className="text-sm text-[var(--brand-muted)]">
        <Link href="/" className="hover:text-[var(--brand-amber-dark)]">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--brand-ink)]">Shop with assistant</span>
      </nav>

      <header className="space-y-2 text-center sm:text-left">
        <h1 className="font-display text-[1.85rem] font-semibold leading-tight tracking-tight text-[var(--brand-ink)] sm:text-3xl">
          Shop with Prisbo Assistant
        </h1>
        <p className="text-pretty text-sm leading-relaxed text-[var(--brand-muted)] sm:text-[15px]">
          Describe who you&apos;re gifting, the occasion, or the kind of thing you&apos;re after. We&apos;ll suggest ideas and narrow the catalogue — then tap{" "}
          <strong className="font-medium text-[var(--brand-ink)]">See matching products</strong> to jump to filtered results. When signed in, your transcript is saved for around ten days since your last message; use{" "}
          <strong className="font-medium text-[var(--brand-ink)]">New conversation</strong> in the assistant panel anytime to wipe the thread and saved copy.
        </p>
      </header>

      <div className="w-full shrink-0">
        <PrisboAssistantChat variant="page" rootId="prisbo-assistant-panel" />
      </div>

      <p className="text-center text-[12px] text-[var(--brand-muted)] sm:text-left">
        Prefer a compact panel while you browse? Tap <strong className="font-medium text-[var(--brand-ink)]">Assistant</strong> in the header (next to search) — it opens the same chat on the right.
      </p>
    </div>
  );
}
