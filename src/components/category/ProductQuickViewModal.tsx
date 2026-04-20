"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatInrFromPaise } from "@/lib/format";
import { StoreMedia } from "@/components/store/StoreMedia";
import { Spinner } from "@/components/ui/Spinner";
import { minOptionPricePaise, productHasOptions } from "@/lib/product-options";
import { colorVariantsFromDoc, listingPrimaryThumb } from "@/lib/product-color-variants";

type QuickProduct = {
  name?: string;
  slug?: string;
  pricePaise?: number;
  images?: string[];
  options?: { key: string; label: string; pricePaise: number; stock: number }[];
  allowCustomerCustomization?: boolean;
};

export function ProductQuickViewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [data, setData] = useState<QuickProduct | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/v1/products/${encodeURIComponent(slug)}`);
        const json = (await res.json()) as { ok?: boolean; data?: QuickProduct; error?: string };
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.error ?? "Could not load product");
        }
        if (!cancelled) setData(json.data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const p = data;
  const multi = p ? productHasOptions(p) : false;
  const basePrice = typeof p?.pricePaise === "number" && Number.isFinite(p.pricePaise) ? p.pricePaise : 0;
  const price = p && multi ? minOptionPricePaise({ options: p.options, pricePaise: basePrice }) : basePrice;
  const cv = p ? colorVariantsFromDoc(p as unknown as Parameters<typeof colorVariantsFromDoc>[0]) : [];
  const imgs = Array.isArray(p?.images) ? p!.images! : [];
  const thumb = p ? listingPrimaryThumb(imgs, cv) ?? imgs[0] : "";

  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Quick view">
      <button type="button" className="absolute inset-0 bg-ink/50 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 m-0 max-h-[min(92dvh,720px)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-sand-deep bg-white shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-sand-deep bg-white/95 px-4 py-3 backdrop-blur-sm">
          <h2 className="font-display text-lg text-ink">Quick view</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-sand-deep px-3 py-1 text-sm text-ink-muted hover:border-accent hover:text-accent"
          >
            Close
          </button>
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Spinner size="sm" />
              Loading…
            </p>
          ) : err ? (
            <p className="text-sm text-rose">{err}</p>
          ) : p ? (
            <div className="space-y-4">
              <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl border border-sand-deep bg-sand-deep">
                {thumb ? (
                  <StoreMedia src={thumb} alt={p.name ?? ""} fill className="object-cover" sizes="320px" />
                ) : null}
              </div>
              <div>
                <h3 className="font-display text-xl text-ink">{p.name}</h3>
                <p className="mt-2 font-display text-2xl font-semibold text-ink">
                  {multi ? (
                    <span>
                      <span className="text-sm font-normal text-ink-muted">From </span>
                      {formatInrFromPaise(price)}
                    </span>
                  ) : (
                    formatInrFromPaise(price)
                  )}
                </p>
                {p.allowCustomerCustomization ? (
                  <p className="mt-2 text-sm text-accent">Personalisation available on the product page.</p>
                ) : null}
                {multi || cv.length > 0 ? (
                  <p className="mt-2 text-sm text-ink-muted">
                    Choose packs or colours on the full page — quick view shows the starting price.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/products/${slug}`}
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center rounded-full bg-accent py-3 text-center text-sm font-semibold text-white hover:bg-accent-light"
                >
                  View details
                </Link>
                <Link
                  href={`/products/${slug}`}
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center rounded-full border-2 border-sand-deep py-3 text-center text-sm font-semibold text-ink hover:border-accent"
                >
                  {p.allowCustomerCustomization ? "Personalise" : "Make it mine"}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
