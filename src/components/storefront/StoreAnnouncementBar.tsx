"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Free shipping on orders above ₹1,499 — Pan India",
  "Personalised gifts made in our studio, not a warehouse",
  "UPI, Cards & COD available at checkout",
];

const STORAGE_KEY = "prisbo_announce_dismissed";
const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

export function StoreAnnouncementBar() {
  const [dismissed, setDismissed] = useState(true);
  const [idx, setIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ts = Number(raw);
        if (!Number.isNaN(ts) && Date.now() - ts < TWENTY_FOUR_H_MS) {
          setDismissed(true);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setDismissed(false);
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const t = setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(t);
  }, [dismissed]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (!mounted) {
    return <div className="h-0 w-full shrink-0" aria-hidden />;
  }

  return (
    <div
      className={`w-full shrink-0 overflow-hidden transition-[max-height] duration-200 ease-out max-[374px]:max-h-0 ${
        dismissed ? "max-h-0" : "max-h-[40px] sm:max-h-[38px]"
      }`}
      aria-hidden={dismissed}
    >
      <div
        className={`relative flex h-[30px] w-full items-center justify-center px-12 max-[374px]:hidden sm:h-[34px] ${
          dismissed ? "pointer-events-none invisible" : ""
        }`}
        style={{
          background: "linear-gradient(90deg, #140b06 0%, #1e0e08 35%, #2a1209 60%, #140b06 100%)",
        }}
        role="region"
        aria-label="Announcements"
      >
        {/* Dot separator flair — two flanking amber dots */}
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-y-1/2 select-none"
          style={{ transform: "translateX(-50%) translateY(-50%)" }}
          aria-hidden
        />

        <p
          className="pointer-events-none max-w-[calc(100%-4rem)] text-center text-[11px] font-normal tracking-[0.1em] text-white/90 transition-opacity duration-300 ease-in-out sm:text-[12px]"
          style={{ opacity: visible ? 1 : 0 }}
          aria-live="polite"
          aria-atomic="true"
        >
          <span
            className="mr-2 text-[9px]"
            style={{ color: "var(--brand-amber)", opacity: 0.85 }}
            aria-hidden
          >
            ●
          </span>
          {MESSAGES[idx]}
          <span
            className="ml-2 text-[9px]"
            style={{ color: "var(--brand-amber)", opacity: 0.85 }}
            aria-hidden
          >
            ●
          </span>
        </p>

        <button
          type="button"
          onClick={dismiss}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-sm leading-none text-white/70 transition-colors duration-150 hover:bg-white/20 hover:text-white sm:h-7 sm:w-7"
          aria-label="Dismiss announcements"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path
              d="M1.5 1.5l7 7M8.5 1.5l-7 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
