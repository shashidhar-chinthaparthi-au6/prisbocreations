"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AiAssistantGlyph } from "@/components/storefront/AiAssistantGlyph";
import {
  clearGuestMessagesFromSession,
  readGuestMessagesFromSession,
  writeGuestMessagesToSession,
} from "@/lib/store/assistant-guest-storage";
import { useAssistantChatStore } from "@/lib/store/assistant-chat-store";

type Props = {
  variant: "sidebar" | "page";
  onAfterApplyProducts?: () => void;
  onClose?: () => void;
  rootId?: string;
};

async function persistThreadToServer() {
  const msgs = useAssistantChatStore.getState().messages;
  try {
    await fetch("/api/storefront/assistant/history", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: msgs.map((m) => ({
          role: m.role,
          content: m.content,
          applyHref: m.applyHref ?? null,
          filterSummary: m.filterSummary ?? null,
        })),
      }),
    });
  } catch {
    /* ignore */
  }
}

export function PrisboAssistantChat({ variant, onAfterApplyProducts, onClose, rootId }: Props) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { data: session, status } = useSession();
  const panelHeadingId = useId();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const messages = useAssistantChatStore((s) => s.messages);
  const setMessages = useAssistantChatStore((s) => s.setMessages);
  const resetConversation = useAssistantChatStore((s) => s.resetConversation);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const historyFetchForUser = useRef<string | null>(null);
  const guestHydratedRef = useRef(false);
  const prevSessionStatusRef = useRef<typeof status | undefined>(undefined);
  const [guestStorageReady, setGuestStorageReady] = useState(false);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, variant]);

  /** Signed-out: restore thread from this tab's sessionStorage (survives refresh & navigation). */
  useEffect(() => {
    if (status === "loading" || status !== "unauthenticated") return;
    if (guestHydratedRef.current) return;
    guestHydratedRef.current = true;
    try {
      const stored = readGuestMessagesFromSession();
      if (stored?.length) setMessages(stored);
    } finally {
      setGuestStorageReady(true);
    }
  }, [setMessages, status]);

  /** Signed-out: keep sessionStorage in sync for guests (after hydrate so we don't clobber stored thread). */
  useEffect(() => {
    if (status !== "unauthenticated" || !guestStorageReady) return;
    writeGuestMessagesToSession(messages);
  }, [guestStorageReady, messages, status]);

  /** On sign-out only, clear in-memory thread and tab stash (privacy). Avoid resetting on every guest mount. */
  useEffect(() => {
    const prev = prevSessionStatusRef.current;
    prevSessionStatusRef.current = status;

    if (status !== "unauthenticated") return;
    historyFetchForUser.current = null;
    if (prev !== "authenticated") return;
    guestHydratedRef.current = false;
    setGuestStorageReady(false);
    resetConversation();
    clearGuestMessagesFromSession();
  }, [resetConversation, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    const uid = session.user.id;
    if (historyFetchForUser.current === uid) return;

    const guest = readGuestMessagesFromSession();
    const shouldMigrateGuest = Boolean(guest?.some((m) => m.role === "user"));

    if (shouldMigrateGuest && guest) {
      historyFetchForUser.current = uid;
      setMessages(guest);
      queueMicrotask(() =>
        void (async () => {
          await persistThreadToServer();
          clearGuestMessagesFromSession();
        })(),
      );
      return;
    }

    if (guest) clearGuestMessagesFromSession();

    let cancelled = false;
    const ac = new AbortController();
    historyFetchForUser.current = uid;
    const lenBefore = useAssistantChatStore.getState().messages.length;

    void (async () => {
      try {
        const r = await fetch("/api/storefront/assistant/history", {
          credentials: "include",
          signal: ac.signal,
        });
        const j = (await r.json()) as {
          ok?: boolean;
          data?: {
            messages?: {
              role: "user" | "assistant";
              content: string;
              applyHref?: string | null;
              filterSummary?: string | null;
            }[];
          };
        };
        if (cancelled || !r.ok || !j.ok || !Array.isArray(j.data?.messages) || !j.data?.messages?.length)
          return;
        /** Don't clobber turns the shopper already exchanged while fetch was in flight. */
        if (useAssistantChatStore.getState().messages.length !== lenBefore) return;
        setMessages(j.data.messages);
      } catch {
        if (!ac.signal.aborted) historyFetchForUser.current = null;
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [session?.user?.id, setMessages, status]);

  const clearAndRestart = useCallback(async () => {
    historyFetchForUser.current = null;
    if (status === "unauthenticated") clearGuestMessagesFromSession();
    resetConversation();
    if (status === "authenticated") {
      try {
        await fetch("/api/storefront/assistant/history", { method: "DELETE", credentials: "include" });
      } catch {
        /* ignore */
      }
    }
  }, [resetConversation, status]);

  const onNewConversation = useCallback(async () => {
    await clearAndRestart();
    if (variant === "sidebar") router.push("/");
  }, [clearAndRestart, router, variant]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const { messages: prior } = useAssistantChatStore.getState();
    const nextHist = [...prior, { role: "user" as const, content: text }];
    setMessages(nextHist);
    if (status === "authenticated") queueMicrotask(() => void persistThreadToServer());
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/storefront/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname,
          messages: nextHist.slice(-14).map((r) => ({ role: r.role, content: r.content })),
        }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        data?: { reply?: string; applyHref?: string | null; filterSummary?: string | null };
      };

      if (!res.ok || !j.ok || typeof j.data?.reply !== "string") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: j?.error ?? "Something went wrong. Please try again in a moment.",
          },
        ]);
        if (status === "authenticated") {
          queueMicrotask(() => void persistThreadToServer());
        }
        return;
      }

      const reply = j.data.reply;
      const applyHref = j.data.applyHref ?? null;
      const filterSummary = j.data.filterSummary ?? null;
      setMessages((prev) => [...prev, { role: "assistant", content: reply, applyHref, filterSummary }]);
      if (status === "authenticated") {
        queueMicrotask(() => {
          void persistThreadToServer();
        });
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, pathname, setMessages, status]);

  const apply = (href: string) => {
    router.push(href);
    onAfterApplyProducts?.();
  };

  const outerClass =
    variant === "sidebar" ?
      "flex h-full max-h-[inherit] min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-[var(--brand-surface)] shadow-none"
    : "flex h-[min(calc(100svh-var(--storefront-header-h,6rem)-3rem),40rem)] min-h-[28rem] w-full flex-col overflow-hidden rounded-[1.25rem] border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-[0_22px_60px_-12px_rgba(26,26,26,0.12)]";

  const headerClass =
    variant === "sidebar" ?
      "shrink-0 px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
    : "shrink-0 rounded-t-[1.25rem] px-5 py-4 sm:px-6";

  return (
    <div id={rootId} className={outerClass} aria-labelledby={panelHeadingId}>
      <header
        className={`flex shrink-0 items-start gap-3 border-b border-[var(--brand-border)] bg-gradient-to-r from-[color-mix(in_srgb,var(--brand-amber-light)_65%,white)] via-white to-[var(--brand-surface)] ${headerClass}`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_14px_-4px_rgba(196,122,43,0.35)] ring-1 ring-[color-mix(in_srgb,var(--brand-amber)_22%,transparent)]">
          <AiAssistantGlyph className="h-10 w-10" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p
            id={panelHeadingId}
            className="font-display text-[1.05rem] font-semibold leading-tight tracking-tight text-[var(--brand-ink)]"
          >
            Prisbo Assistant
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--brand-muted)]">Gift ideas &amp; catalogue help</p>
          {variant === "sidebar" ?
            <p className="mt-1.5 text-[11px] text-[var(--brand-muted)]">
              <Link
                href="/assistant"
                className="font-medium text-[var(--brand-amber-dark)] underline decoration-[color-mix(in_srgb,var(--brand-amber)_45%,transparent)] underline-offset-2 hover:decoration-[var(--brand-amber)]"
                onClick={() => onAfterApplyProducts?.()}
              >
                Open full-page assistant
              </Link>
            </p>
          : null}
        </div>
        {onClose ?
          <button
            type="button"
            aria-label="Close assistant"
            onClick={onClose}
            className="-mr-1 -mt-0.5 flex h-11 min-w-[44px] shrink-0 items-center justify-center rounded-full text-[1.35rem] leading-none text-[var(--brand-muted)] transition hover:bg-[color-mix(in_srgb,var(--brand-ink)_6%,transparent)] hover:text-[var(--brand-ink)]"
          >
            ×
          </button>
        : null}

      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--brand-border)] bg-[color-mix(in_srgb,var(--brand-surface)_85%,white)] px-3 py-2">
        <p className="min-w-[8rem] flex-1 text-[10px] leading-snug text-[var(--brand-muted)] sm:text-[11px]">
          {status === "authenticated" ?
            <>
              Saved while signed in (about ten days since your last message). Scroll to see older turns.
            </>
          : "This browser tab keeps your chat until you close it. Sign in to save across devices."}
        </p>
        <div className="ml-auto flex shrink-0">
          <button
            type="button"
            className="btn-secondary min-h-[2rem] px-3 py-1.5 text-[11px] font-semibold"
            onClick={() => void onNewConversation()}
          >
            New conversation
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`scrollbar-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-4 py-4 ${variant === "page" ? "sm:px-6" : ""}`}
      >
        {messages.map((r, i) => (
          <div key={i} className={`flex ${r.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={
                r.role === "user" ?
                  "max-w-[90%] rounded-2xl rounded-br-[0.375rem] bg-gradient-to-br from-[#242428] to-[#1a1a1f] px-3.5 py-3 text-[13.5px] leading-[1.55] text-white shadow-[0_4px_12px_-4px_rgba(26,26,26,0.35)]"
                : `max-w-[92%] rounded-2xl rounded-bl-[0.375rem] border border-[color-mix(in_srgb,var(--brand-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--brand-card)_88%,var(--brand-surface))] px-3.5 py-3 text-[13.5px] leading-[1.55] text-[var(--brand-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]`
              }
            >
              <p className="whitespace-pre-wrap">{r.content}</p>
              {r.role === "assistant" && r.filterSummary ?
                <p className="mt-2 text-[11px] leading-snug text-[var(--brand-muted)]">
                  <span className="font-semibold text-[var(--brand-ink)]">Showing: </span>
                  {r.filterSummary}
                </p>
              : null}
              {r.role === "assistant" && r.applyHref ?
                <button
                  type="button"
                  onClick={() => apply(r.applyHref!)}
                  className="btn-primary mt-3 min-h-[2.25rem] w-full px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                >
                  See matching products
                </button>
              : null}
            </div>
          </div>
        ))}
        {loading ?
          <div className="flex justify-start pt-1">
            <div
              aria-live="polite"
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--brand-border)] bg-white/85 px-3.5 py-2.5 text-[12px] text-[var(--brand-muted)]"
            >
              <span className="inline-flex gap-1 pt-0.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-amber)]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-amber)] delay-75" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-amber)] delay-150" />
              </span>
              Thinking…
            </div>
          </div>
        : null}
      </div>

      <footer
        className={`shrink-0 border-t border-[var(--brand-border)] bg-[color-mix(in_srgb,var(--brand-surface)_50%,white)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 ${variant === "page" ? "sm:px-6" : ""}`}
      >
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={"Describe what you're looking for…"}
            className="min-h-[5.25rem] flex-1 resize-none rounded-xl border border-[var(--brand-border-dark)] bg-white px-3 py-3 text-[15px] leading-snug text-[var(--brand-ink)] placeholder:text-[var(--brand-muted)] focus:border-[var(--brand-amber)] focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--brand-amber-light)_70%,transparent)]"
          />
          <button
            type="button"
            disabled={loading || !input.trim()}
            onClick={() => void send()}
            className="btn-primary h-[2.75rem] min-w-[4.5rem] shrink-0 self-end px-4 text-sm font-semibold"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
