"use client";

import { useState } from "react";

function StarIcon({ filled, size = 32 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      className="shrink-0"
      aria-hidden
    >
      <path
        fill={filled ? "var(--am)" : "none"}
        stroke="var(--am)"
        strokeWidth="1.2"
        d="M10 2.5l2.35 4.76 5.26.76-3.8 3.7.9 5.24L10 14.9l-4.71 2.48.9-5.24-3.8-3.7 5.26-.76L10 2.5z"
      />
    </svg>
  );
}

export function StarPicker({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Your rating"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const active = i <= (hovered || rating);
        return (
          <button
            key={i}
            type="button"
            className="rounded p-0.5 transition-opacity hover:opacity-90"
            onMouseEnter={() => setHovered(i)}
            onClick={() => onChange(i)}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
          >
            <StarIcon filled={active} size={32} />
          </button>
        );
      })}
    </div>
  );
}
