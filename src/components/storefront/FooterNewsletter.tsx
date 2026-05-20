"use client";

import { useState } from "react";

export function FooterNewsletter() {
  const [emailVal, setEmailVal] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailVal.trim()) return;
    /* TODO: wire to newsletter API */
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex max-w-[340px] items-center gap-2 rounded-full border border-white/15 bg-white/8 px-5 py-3 text-[13px] text-white/80">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className="shrink-0 text-[#b5661a]"
        >
          <path
            d="M3 8l3.5 3.5L13 4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        You&apos;re subscribed — welcome to the loop!
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-[380px] flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input
        type="email"
        value={emailVal}
        onChange={(e) => setEmailVal(e.target.value)}
        placeholder="Your email address"
        required
        className="h-11 w-full rounded-full border border-white/15 bg-white/[0.08] px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none ring-0 transition-colors duration-150 focus:border-[var(--brand-amber)] sm:max-w-[280px]"
        style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
      />
      <button
        type="submit"
        className="h-11 shrink-0 rounded-full px-5 text-sm font-semibold text-white transition-colors duration-150 hover:opacity-90 active:scale-95"
        style={{ backgroundColor: "var(--brand-amber-dark)" }}
      >
        Subscribe
      </button>
    </form>
  );
}
