"use client";

import { useEffect, useState } from "react";

export function ReviewPhotos({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowLeft") setOpen((i) => (i !== null && i > 0 ? i - 1 : i));
      if (e.key === "ArrowRight")
        setOpen((i) => (i !== null && i < urls.length - 1 ? i + 1 : i));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, urls.length]);

  if (!urls.length) return null;

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {urls.slice(0, 3).map((u, i) => (
          <button
            key={u + i}
            type="button"
            className="h-12 w-12 overflow-hidden rounded-md border border-[var(--brand-border)] bg-[var(--brand-sand,#F5F0E8)]"
            onClick={() => setOpen(i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {open !== null ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white"
            onClick={() => setOpen(null)}
          >
            ×
          </button>
          {open > 0 ? (
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setOpen((i) => (i !== null ? i - 1 : i));
              }}
            >
              ←
            </button>
          ) : null}
          {open < urls.length - 1 ? (
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setOpen((i) => (i !== null ? i + 1 : i));
              }}
            >
              →
            </button>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[open] ?? ""}
            alt="Review"
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
