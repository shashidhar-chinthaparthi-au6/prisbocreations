"use client";

import { useId } from "react";

/** Brand amber sparkle mark for Prisbo Assistant entry points + header. */
export function AiAssistantGlyph({ className }: { className?: string }) {
  const gid = useId().replace(/:/g, "");

  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={`${gid}-fill`} x1="10" y1="8" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d4944a" />
          <stop offset="0.5" stopColor="#c47a2b" />
          <stop offset="1" stopColor="#9a5e1e" />
        </linearGradient>
        <linearGradient id={`${gid}-shine`} x1="24" y1="12" x2="24" y2="36">
          <stop stopColor="#fffdf8" />
          <stop offset="1" stopColor="#fdeed4" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill={`url(#${gid}-fill)`} />
      <circle cx="24" cy="24" r="21" stroke="#fff" strokeOpacity="0.25" strokeWidth="1" />
      <path
        fill={`url(#${gid}-shine)`}
        d="M24 13.5l1.45 6.18 5.94.52-4.55 3.95 1.4 5.8L24 26.9l-5.24 3.05 1.4-5.8-4.55-3.95 5.94-.52L24 13.5Z"
      />
      <path
        fill="#fff"
        fillOpacity="0.9"
        d="M34 16.5h1.2v2.4H34v-2.4zm-16-2h1.8v1.5h-1.8v-1.5zm2.4 16.2h1.5v1.8h-1.5v-1.8zm12.6 2.7h1.2v2.1H33v-2.1z"
      />
    </svg>
  );
}
