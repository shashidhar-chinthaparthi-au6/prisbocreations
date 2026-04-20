"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { cartLineId } from "@/lib/cart-line-id";
import { formatInrFromPaise } from "@/lib/format";
import { getLowStockThreshold } from "@/lib/admin/low-stock";
import { WishlistHeart } from "@/components/ui/WishlistHeart";
import type { StorefrontProductCard } from "@/lib/services/storefrontCatalog";

type Props = {
  product: StorefrontProductCard;
  /** Quick add uses default option when product has pack rows */
  defaultOptionKey?: string;
  /** Wishlist page: undo toast when removing; optional restock notify for OOS. */
  wishlistRemoveUndo?: boolean;
  onStockNotify?: () => void;
};

export function ProductCard({ product, defaultOptionKey, wishlistRemoveUndo, onStockNotify }: Props) {
  const { add, lines, setQty } = useCart();
  const [hover, setHover] = useState(false);

  const lineId = useMemo(
    () => cartLineId(product.id, defaultOptionKey, {}),
    [product.id, defaultOptionKey],
  );
  const line = lines.find((l) => l.id === lineId);
  const inCartQty = line?.quantity ?? 0;
  const maxQty = Math.max(1, product.stock);

  const out = product.stock <= 0;
  const low = !out && product.stock <= getLowStockThreshold();
  const discountPct =
    product.compareAtPaise && product.compareAtPaise > product.listPricePaise
      ? Math.round((1 - product.listPricePaise / product.compareAtPaise) * 100)
      : null;

  const secondaryImg = product.hoverImageUrl;

  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (out) return;
    if (product.multi) {
      window.location.href = `/products/${product.slug}`;
      return;
    }
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.imageUrl,
      pricePaise: product.listPricePaise,
      optionKey: defaultOptionKey,
    });
  };

  const onDec = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQty(lineId, inCartQty - 1);
  };

  const onInc = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCartQty >= maxQty) return;
    setQty(lineId, inCartQty + 1);
  };

  const cardClass = useMemo(
    () =>
      `group flex flex-col rounded-[12px] bg-[var(--brand-card)] shadow-[var(--shadow-card)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(0,0,0,0.12)] ${
        out ? "opacity-95" : ""
      }`,
    [out],
  );

  return (
    <article className={cardClass}>
      <Link
        href={`/products/${product.slug}`}
        className="block overflow-hidden rounded-t-[12px]"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="relative aspect-square overflow-hidden rounded-[10px]">
          {product.imageUrl ? (
            <>
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className={`object-cover transition duration-300 ${
                  secondaryImg && hover ? "opacity-0" : "opacity-100"
                } ${out ? "grayscale-[30%]" : ""}`}
                sizes="(max-width:640px) 45vw, (max-width:1024px) 33vw, 25vw"
              />
              {secondaryImg ? (
                <Image
                  src={secondaryImg}
                  alt=""
                  fill
                  className={`absolute inset-0 object-cover transition duration-300 ${
                    hover ? "opacity-100" : "opacity-0"
                  }`}
                  sizes="(max-width:640px) 45vw, (max-width:1024px) 33vw, 25vw"
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--brand-surface)] text-sm text-[var(--brand-muted)]">
              No image
            </div>
          )}
          {out ? (
            <span className="absolute left-2 top-2 rounded-full bg-[var(--brand-muted)] px-2 py-0.5 text-[11px] font-semibold text-white">
              Out of stock
            </span>
          ) : low ? (
            <span className="absolute left-2 top-2 rounded-full bg-[var(--brand-amber)] px-2 py-0.5 text-[11px] font-semibold text-white">
              Low stock
            </span>
          ) : product.isNew ? (
            <span className="absolute left-2 top-2 rounded-full bg-[var(--brand-ink)] px-2 py-0.5 text-[11px] font-semibold text-white">
              New
            </span>
          ) : null}
          <span className="absolute right-2 top-2 z-[2]">
            <WishlistHeart
              productId={product.id}
              productName={product.name}
              showRemoveUndo={wishlistRemoveUndo}
            />
          </span>
        </div>
      </Link>
      <div className="flex flex-1 flex-col px-1 pb-3 pt-3">
        {product.subcategoryName ? (
          <p className="text-[12px] font-medium uppercase tracking-wide text-[var(--brand-muted)] line-clamp-1">
            {product.subcategoryName}
          </p>
        ) : null}
        <Link href={`/products/${product.slug}`}>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-[var(--brand-ink)]">{product.name}</h3>
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="font-mono text-base font-semibold text-[var(--brand-ink)]">
            {formatInrFromPaise(product.listPricePaise)}
          </span>
          {product.compareAtPaise && product.compareAtPaise > product.listPricePaise ? (
            <>
              <span className="font-mono text-[13px] text-[var(--brand-muted)] line-through">
                {formatInrFromPaise(product.compareAtPaise)}
              </span>
              {discountPct != null ? (
                <span className="text-[12px] font-semibold text-[var(--brand-amber)]">{discountPct}% off</span>
              ) : null}
            </>
          ) : null}
        </div>
        {out ? (
          onStockNotify ? (
            <button type="button" onClick={onStockNotify} className="btn-primary mt-3 w-full">
              Notify me
            </button>
          ) : (
            <button type="button" disabled className="btn-primary mt-3 w-full cursor-not-allowed opacity-60">
              Notify me
            </button>
          )
        ) : product.multi ? (
          <button type="button" onClick={onAdd} className="btn-primary mt-3 w-full">
            Choose options
          </button>
        ) : inCartQty >= 1 ? (
          <div
            className="mt-3 inline-flex w-full items-center justify-between rounded-full border border-[var(--brand-border)] bg-[var(--brand-card)] p-1 shadow-[var(--shadow-card)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={onDec}
              className="inline-flex h-9 min-w-9 flex-1 items-center justify-center rounded-full bg-[var(--brand-surface)] text-base font-semibold text-[var(--brand-ink)] hover:bg-[var(--brand-amber-light)] sm:h-10 sm:min-w-10"
            >
              −
            </button>
            <span className="min-w-[2rem] flex-1 text-center text-sm font-semibold tabular-nums text-[var(--brand-ink)] sm:text-base">
              {inCartQty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={onInc}
              disabled={inCartQty >= maxQty}
              className="inline-flex h-9 min-w-9 flex-1 items-center justify-center rounded-full bg-[var(--brand-amber)] text-base font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 sm:h-10 sm:min-w-10"
            >
              +
            </button>
          </div>
        ) : (
          <button type="button" onClick={onAdd} className="btn-primary mt-3 w-full">
            Add to cart
          </button>
        )}
      </div>
    </article>
  );
}
