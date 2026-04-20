"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatInrFromPaise } from "@/lib/format";

type SuggestProduct = { slug: string; name: string; thumb: string | null; displayPricePaise: number };
type SuggestCategory = { slug: string; name: string };
type SuggestTag = { label: string };

type SuggestResponse = {
  query: string;
  products: SuggestProduct[];
  categories: SuggestCategory[];
  tags: SuggestTag[];
};

export function StoreSearchOverlayFull({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [data, setData] = useState<SuggestResponse | null>(null);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const runSearch = useCallback((raw: string) => {
    const s = raw.trim();
    if (!s) {
      setData(null);
      return;
    }
    void (async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(s)}`);
        const j = (await r.json()) as { ok?: boolean; data?: SuggestResponse };
        if (j.data) setData(j.data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (tRef.current) clearTimeout(tRef.current);
    if (!q.trim()) {
      setData(null);
      return;
    }
    tRef.current = setTimeout(() => runSearch(q), 300);
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, [q, runSearch]);

  const goResults = () => {
    const s = q.trim();
    if (!s) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(s)}`);
  };

  return (
    <div className="fixed inset-0 z-[220] flex flex-col bg-[var(--brand-card)]" role="dialog" aria-label="Search">
      <div className="flex items-center gap-2 border-b border-[var(--brand-border)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") goResults();
          }}
          placeholder="Search products, categories, occasions…"
          className="min-h-[48px] flex-1 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 text-[18px] text-[var(--brand-ink)] outline-none ring-[var(--brand-amber)] focus:ring-2"
          aria-label="Search query"
        />
        {q ? (
          <button
            type="button"
            className="flex h-11 min-w-[44px] items-center justify-center rounded-full text-[var(--brand-muted)] hover:bg-[var(--brand-amber-light)]"
            onClick={() => setQ("")}
            aria-label="Clear search"
          >
            ×
          </button>
        ) : null}
        <button
          type="button"
          className="flex h-11 min-w-[44px] items-center justify-center rounded-full text-sm font-medium text-[var(--brand-muted)] hover:bg-[var(--brand-amber-light)]"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        {data && q.trim() ? (
          <div className="mx-auto max-w-2xl space-y-8">
            {data.products.length > 0 ? (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                  Products
                </h2>
                <ul className="mt-3 space-y-2">
                  {data.products.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/products/${p.slug}`}
                        className="flex items-center gap-3 rounded-xl border border-[var(--brand-border)] p-2 hover:bg-[var(--brand-amber-light)]"
                        onClick={onClose}
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--brand-surface)]">
                          {p.thumb ? (
                            <Image src={p.thumb} alt="" fill className="object-cover" sizes="56px" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[var(--brand-ink)] line-clamp-2">{p.name}</p>
                          <p className="font-mono text-sm text-[var(--brand-muted)]">
                            {formatInrFromPaise(p.displayPricePaise)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {data.categories.length > 0 ? (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                  Categories
                </h2>
                <ul className="mt-3 space-y-1">
                  {data.categories.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/category/${c.slug}`}
                        className="block rounded-lg py-2 font-medium text-[var(--brand-ink)] hover:text-[var(--brand-amber-dark)]"
                        onClick={onClose}
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {data.tags.length > 0 ? (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                  Related
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.tags.map((t) => (
                    <Link
                      key={t.label}
                      href={`/search?q=${encodeURIComponent(t.label)}`}
                      className="rounded-full border border-[var(--brand-border)] px-3 py-1.5 text-sm text-[var(--brand-ink)] hover:border-[var(--brand-amber)]"
                      onClick={onClose}
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
            <button type="button" className="btn-primary w-full" onClick={goResults}>
              View all results
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-[var(--brand-muted)]">Start typing to search the catalog.</p>
        )}
      </div>
    </div>
  );
}
