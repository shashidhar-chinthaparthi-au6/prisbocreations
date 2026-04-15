"use client";

import Link from "next/link";
import { QuickAddToCart } from "@/components/category/QuickAddToCart";
import { StoreMedia } from "@/components/store/StoreMedia";
import { formatInrFromPaise } from "@/lib/format";

type Props = {
  variant: "featured" | "explore";
  slug: string;
  name: string;
  productId: string;
  listPricePaise: number;
  compareAtPaise?: number;
  stock: number;
  imageUrl?: string;
  hoverImageUrl?: string;
  multi: boolean;
  hasColorVariants: boolean;
};

export function HomeProductCard({
  variant,
  slug,
  name,
  productId,
  listPricePaise,
  compareAtPaise,
  stock,
  imageUrl,
  hoverImageUrl,
  multi,
  hasColorVariants,
}: Props) {
  const requiresOptionChoice = multi || hasColorVariants;
  const addStock = multi ? 1 : stock;

  const outer =
    variant === "featured"
      ? "group/card flex h-full w-[32vw] max-w-[7.25rem] shrink-0 flex-col overflow-hidden rounded-lg border border-sand-deep bg-white shadow-sm transition hover:border-accent sm:w-28 md:max-w-none"
      : "group/card flex h-full flex-col overflow-hidden rounded-lg border border-sand-deep bg-white shadow-sm transition hover:border-accent hover:shadow-md";
  const onSale =
    typeof compareAtPaise === "number" &&
    compareAtPaise > listPricePaise &&
    Number.isFinite(compareAtPaise);

  const bodyPad = variant === "featured" ? "p-1.5" : "p-2 sm:p-2.5";
  const titleClass =
    variant === "featured"
      ? "line-clamp-2 text-[11px] font-medium leading-tight text-ink group-hover/card:text-accent"
      : "line-clamp-2 font-display text-xs font-medium leading-snug text-ink group-hover/card:text-accent sm:text-sm";
  const priceClass =
    variant === "featured"
      ? "min-w-0 shrink truncate text-xs font-bold tabular-nums text-ink sm:text-sm"
      : "min-w-0 shrink truncate text-sm font-bold tabular-nums text-ink sm:text-base";

  return (
    <div className={outer}>
      <Link href={`/product/${slug}`} className="block min-w-0 shrink-0">
        <div className="relative aspect-square w-full bg-sand-deep">
          {!imageUrl ? (
            <div className="flex h-full items-center justify-center text-[10px] text-ink-muted">
              No image
            </div>
          ) : hoverImageUrl && variant === "explore" ? (
            <>
              <div className="relative hidden h-full w-full md:block">
                <StoreMedia
                  src={imageUrl}
                  alt={name}
                  fill
                  className="object-cover transition-opacity duration-300 group-hover/card:opacity-0"
                  sizes="(max-width:640px) 45vw, (max-width:1024px) 30vw, 22vw"
                  fetchPriority="low"
                  videoControls={false}
                />
                <StoreMedia
                  src={hoverImageUrl}
                  alt=""
                  fill
                  className="absolute inset-0 object-cover opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
                  sizes="(max-width:640px) 45vw, (max-width:1024px) 30vw, 22vw"
                  fetchPriority="low"
                  videoControls={false}
                />
              </div>
              <div className="relative block h-full w-full md:hidden">
                <StoreMedia
                  src={imageUrl}
                  alt={name}
                  fill
                  className="object-cover transition duration-300 group-hover/card:scale-[1.03]"
                  sizes="(max-width:640px) 45vw, (max-width:1024px) 30vw, 22vw"
                  fetchPriority="low"
                  videoControls={false}
                />
              </div>
            </>
          ) : (
            <StoreMedia
              src={imageUrl}
              alt={name}
              fill
              className={`object-cover ${variant === "featured" ? "transition duration-300 group-hover/card:scale-[1.02]" : "transition duration-300 group-hover/card:scale-[1.03]"}`}
              sizes={
                variant === "featured"
                  ? "(max-width:768px) 32vw, 116px"
                  : "(max-width:640px) 45vw, (max-width:1024px) 30vw, 22vw"
              }
              fetchPriority="low"
              videoControls={false}
            />
          )}
        </div>
      </Link>
      <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${bodyPad}`}>
        <Link href={`/product/${slug}`} className={`mb-1 block min-h-0 min-w-0 ${titleClass}`}>
          {name}
        </Link>
        <div
          className={`mt-auto flex min-h-[2rem] items-center justify-between gap-1 border-t border-sand-deep/80 pt-1.5 sm:min-h-[2.25rem] ${variant === "explore" ? "sm:gap-2" : ""}`}
        >
          <p className={priceClass} title={multi ? `From ${formatInrFromPaise(listPricePaise)}` : formatInrFromPaise(listPricePaise)}>
            {onSale ? (
              <span className="flex flex-col items-start gap-0.5">
                <span className="text-[11px] font-normal text-ink-muted line-through sm:text-xs">
                  {formatInrFromPaise(compareAtPaise!)}
                </span>
                <span className="text-emerald-800">
                  {multi ? (
                    <>
                      <span className="text-[11px] font-normal text-ink-muted sm:text-xs">From </span>
                      {formatInrFromPaise(listPricePaise)}
                    </>
                  ) : (
                    formatInrFromPaise(listPricePaise)
                  )}
                </span>
              </span>
            ) : multi ? (
              <>
                <span className="text-[11px] font-normal text-ink-muted sm:text-xs">From </span>
                {formatInrFromPaise(listPricePaise)}
              </>
            ) : (
              formatInrFromPaise(listPricePaise)
            )}
          </p>
          <QuickAddToCart
            compact
            inline
            stock={addStock}
            requiresOptionChoice={requiresOptionChoice}
            product={{
              id: productId,
              slug,
              name,
              pricePaise: listPricePaise,
              image: imageUrl,
            }}
          />
        </div>
      </div>
    </div>
  );
}
