"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AiAssistantGlyph } from "@/components/storefront/AiAssistantGlyph";
import {
  ASSISTANT_REPLY_LANGUAGE_OPTIONS,
  DEFAULT_ASSISTANT_PREFERENCES,
  type AssistantPreferences,
  type AssistantReplyLanguageId,
  readAssistantPreferences,
  speechRecognitionLang,
  speechSynthesisLang,
  writeAssistantPreferences,
} from "@/lib/store/assistant-preferences";
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

function MicGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.42 2.72 6.23 6 6.72V22h2v-4.28c3.28-.49 6-3.29 6-6.72h-1.7z" />
    </svg>
  );
}

function StopRecordingGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SpeakerGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

type SpeechRecognitionAlternativeLike = { transcript: string };

type SpeechRecognitionResultLike = { 0?: SpeechRecognitionAlternativeLike; length?: number };

type SpeechRecognitionResultListLike = {
  length: number;
  [n: number]: SpeechRecognitionResultLike;
};

/** Minimal shape for Chromium / WebKitSpeechRecognition browsers. */
type SpeechRecognitionBrowser = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  abort?: () => void;
  onresult:
    | ((
        ev: {
          resultIndex: number;
          results: SpeechRecognitionResultListLike;
        },
      ) => void)
    | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionBrowser) | null {
  if (typeof globalThis === "undefined") return null;
  const g = globalThis as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionBrowser;
    webkitSpeechRecognition?: new () => SpeechRecognitionBrowser;
  };
  return g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null;
}

function speakAssistantReply(content: string, replyLanguage: AssistantReplyLanguageId): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const clean = content.replace(/\s+/g, " ").trim().slice(0, 4000);
  if (!clean) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = speechSynthesisLang(replyLanguage);
  window.speechSynthesis.speak(utter);
}

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

  const prefsId = useId();
  const micId = useId();
  const speechOutId = useId();
  const [prefs, setPrefs] = useState<AssistantPreferences>(DEFAULT_ASSISTANT_PREFERENCES);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechErr, setSpeechErr] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionBrowser | null>(null);

  useEffect(() => {
    setPrefs(readAssistantPreferences());
    setPrefsHydrated(true);
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    writeAssistantPreferences(prefs);
  }, [prefsHydrated, prefs]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort?.();
      } catch {
        /* ignore */
      }
      if (typeof window !== "undefined") window.speechSynthesis?.cancel?.();
    };
  }, []);

  useEffect(() => {
    if (prefs.speechInputEnabled) return;
    if (!listening) return;
    try {
      recognitionRef.current?.abort?.();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, [prefs.speechInputEnabled, listening]);

  const hasSpeechRecognition =
    typeof globalThis !== "undefined" && Boolean(getSpeechRecognitionCtor());

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

  const toggleSpeechInput = useCallback(() => {
    if (!prefs.speechInputEnabled || loading) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechErr("Speech input is not supported in this browser.");
      return;
    }
    setSpeechErr(null);

    if (listening && recognitionRef.current) {
      try {
        recognitionRef.current?.abort?.();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
      setListening(false);
      return;
    }

    try {
      /** Fresh dictation pass — clear so a new mic tap doesn’t stack on old text */
      setInput("");
      const r = new Ctor();
      r.lang = speechRecognitionLang(prefs.replyLanguage);
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.continuous = false;
      r.onresult = (ev) => {
        let t = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const row = ev.results[i];
          const part = row?.[0]?.transcript;
          if (part) t += part;
        }
        const next = t.trim();
        if (next.length) {
          setInput((prev) => `${prev}${prev.trim() ? " " : ""}${next}`.slice(0, 4000));
        }
      };
      r.onerror = (ev) => {
        setListening(false);
        recognitionRef.current = null;
        if (ev.error !== "aborted" && ev.error !== "no-speech") {
          setSpeechErr("Speech didn’t catch that — try again or type.");
        }
      };
      r.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };
      recognitionRef.current = r;
      setListening(true);
      r.start();
    } catch {
      setListening(false);
      setSpeechErr("Microphone unavailable.");
    }
  }, [listening, loading, prefs.replyLanguage, prefs.speechInputEnabled]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const prefsSnapshot = prefs;
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
          replyLanguage: prefsSnapshot.replyLanguage,
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
      if (prefsSnapshot.speechOutputEnabled) {
        queueMicrotask(() => speakAssistantReply(reply, prefsSnapshot.replyLanguage));
      }
      if (status === "authenticated") {
        queueMicrotask(() => {
          void persistThreadToServer();
        });
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, pathname, prefs, setMessages, status]);

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
        <details className="mb-3 rounded-lg border border-[var(--brand-border)] bg-white/80 px-3 py-2 text-[12px]">
          <summary className="cursor-pointer list-inside font-semibold text-[var(--brand-ink)]">
            Voice &amp; language preferences
          </summary>
          <div className="mt-3 space-y-3 border-t border-[color-mix(in_srgb,var(--brand-border)_75%,transparent)] pt-3 text-[var(--brand-ink)]">
            <div>
              <label htmlFor={`${prefsId}-lang`} className="block text-[11px] font-medium text-[var(--brand-muted)]">
                Assistant replies in
              </label>
              <select
                id={`${prefsId}-lang`}
                value={prefs.replyLanguage}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    replyLanguage: e.target.value as AssistantReplyLanguageId,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-[var(--brand-border-dark)] bg-white px-2 py-1.5 text-[13px] text-[var(--brand-ink)] focus:border-[var(--brand-amber)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-amber-light)_70%,transparent)]"
              >
                {ASSISTANT_REPLY_LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] leading-snug text-[var(--brand-muted)]">
                Catalog filters stay in English; this only affects the assistant wording you read.
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                id={micId}
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--brand-border-dark)] accent-[var(--brand-amber)]"
                checked={prefs.speechInputEnabled}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, speechInputEnabled: e.target.checked }))
                }
              />
              <MicGlyph className="mt-0.5 shrink-0 text-[var(--brand-amber-dark)] opacity-85" />
              <span className="min-w-0">
                <span className="inline-flex items-center gap-1 font-medium">
                  <span>Speech input</span>
                </span>
                <span className="block text-[11px] text-[var(--brand-muted)]">
                  Shows the mic next to Send (browser speech‑to‑text; may ask for mic permission).
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                id={speechOutId}
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--brand-border-dark)] accent-[var(--brand-amber)]"
                checked={prefs.speechOutputEnabled}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, speechOutputEnabled: e.target.checked }))
                }
              />
              <SpeakerGlyph className="mt-0.5 shrink-0 text-[var(--brand-amber-dark)] opacity-85" />
              <span className="min-w-0">
                <span className="inline-flex items-center gap-1 font-medium">
                  <span>Read replies aloud</span>
                </span>
                <span className="block text-[11px] text-[var(--brand-muted)]">
                  Speaks each assistant reply (on by default; uses your browser voice).
                </span>
              </span>
            </label>
            {prefs.speechInputEnabled && !hasSpeechRecognition ?
              <p className="rounded-md bg-[color-mix(in_srgb,var(--brand-amber-light)_55%,white)] px-2 py-1.5 text-[11px] text-[var(--brand-amber-dark)]">
                This browser doesn&apos;t expose speech‑to‑text. Use Chrome / Edge / Safari current versions, or type instead.
              </p>
            : null}
            {speechErr ?
              <p className="rounded-md bg-rose-50 px-2 py-1.5 text-[11px] text-rose-900">{speechErr}</p>
            : null}
          </div>
        </details>

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
          <div className="flex shrink-0 flex-col items-stretch gap-2 self-end">
            {prefs.speechInputEnabled ?
              <button
                type="button"
                onClick={() => void toggleSpeechInput()}
                disabled={loading || !hasSpeechRecognition}
                aria-label={listening ? "Stop microphone" : "Speak to type"}
                aria-pressed={listening}
                className={`flex h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-xl border px-2 transition ${
                  listening ?
                    "border-[var(--brand-amber-dark)] bg-[color-mix(in_srgb,var(--brand-amber-light)_70%,white)] text-[var(--brand-amber-dark)]"
                  : "border-[var(--brand-border-dark)] bg-white text-[var(--brand-muted)] hover:border-[var(--brand-amber)] hover:text-[var(--brand-ink)]"
                } ${loading ? "cursor-not-allowed opacity-45" : ""}`}
              >
                {listening ? <StopRecordingGlyph /> : <MicGlyph />}
              </button>
            : null}
            <button
              type="button"
              disabled={loading || !input.trim()}
              onClick={() => void send()}
              className="btn-primary h-[2.75rem] min-w-[4.5rem] px-4 text-sm font-semibold"
            >
              Send
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
