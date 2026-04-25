"use client";

import { useId, useState } from "react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 10 10"
      width={12}
      height={12}
      className={`shrink-0 text-[var(--muted)] transition-transform duration-200 max-lg:scale-90 max-lg:origin-center ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path
        d="M2 3.5L5 6.5L8 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FilterSection({ title, defaultOpen = true, children }: Props) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--bd)] py-2.5 last:border-b-0 lg:py-3">
      <button
        type="button"
        id={`${id}-btn`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full min-h-[2rem] cursor-pointer items-center justify-between gap-2 text-left text-[10px] font-semibold text-[var(--ink)] sm:text-xs lg:text-sm"
      >
        <span>{title}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-btn`} className="space-y-1.5 lg:space-y-2.5">
          {children}
        </div>
      ) : null}
    </div>
  );
}
