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
  const [hidden, setHidden] = useState(true);
  const [idx, setIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [fade, setFade] = useState(1);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ts = Number(raw);
        if (!Number.isNaN(ts) && Date.now() - ts < TWENTY_FOUR_H_MS) {
          setHidden(true);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setHidden(false);
  }, []);

  useEffect(() => {
    if (hidden) return;
    const t = setInterval(() => {
      setFade(0);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % MESSAGES.length);
        setFade(1);
      }, 280);
    }, 4000);
    return () => clearInterval(t);
  }, [hidden]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  if (!mounted || hidden) return null;

  return (
    <div
      className="relative flex h-[34px] w-full shrink-0 items-center justify-center bg-[#C47A2B] px-10 text-[12px] leading-none tracking-[0.01em] text-white"
      role="region"
      aria-label="Announcements"
    >
      <p
        key={idx}
        className="pointer-events-none max-w-[calc(100%-3rem)] text-center transition-opacity duration-300 ease-out"
        style={{ opacity: fade }}
      >
        {MESSAGES[idx]}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-lg leading-none text-white hover:bg-white/15"
        aria-label="Dismiss announcements"
      >
        ×
      </button>
    </div>
  );
}
