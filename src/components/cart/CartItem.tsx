"use client";

import Link from "next/link";
import type { CartLine } from "@/components/cart/CartProvider";
import { StoreMedia } from "@/components/store/StoreMedia";
import { formatInrFromPaise } from "@/lib/format";
import { GIFT_WRAP_PAISE } from "@/lib/gift-wrap";

type Props = {
  line: CartLine;
  compact?: boolean;
  maxQty?: number;
  onQty: (lineId: string, q: number) => void;
  onRemove: (line: CartLine) => void;
  onCloseDrawer?: () => void;
};

export function CartItem({ line, compact, maxQty, onQty, onRemove, onCloseDrawer }: Props) {
  const img = compact ? 56 : 80;
  const cap = typeof maxQty === "number" && maxQty > 0 ? maxQty : 9999;
  const atMax = line.quantity >= cap;

  return (
    <li className={`flex gap-3 ${compact ? "rounded-xl border border-[#E8E0D6] bg-[#F5F5F4]/50 p-3" : "rounded-2xl border border-[#E8E0D6] bg-white p-4"}`}>
      <Link
        href={`/products/${line.slug}`}
        onClick={() => onCloseDrawer?.()}
        className={`relative shrink-0 overflow-hidden rounded-lg bg-[#E8E0D6] ${compact ? "h-14 w-14" : "h-20 w-20 sm:h-24 sm:w-24"}`}
      >
        {line.image ? (
          <StoreMedia
            src={line.image}
            alt=""
            fill
            className="object-cover"
            sizes={`${img}px`}
            fetchPriority="low"
            videoControls={false}
          />
        ) : null}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${line.slug}`}
          onClick={() => onCloseDrawer?.()}
          className={`font-medium text-[#3D3835] hover:text-[#C47A2B] ${compact ? "line-clamp-2 text-[13px] leading-snug" : "line-clamp-2 text-sm sm:text-[15px]"}`}
        >
          {line.name}
        </Link>
        {[line.colorLabel, line.optionLabel].filter(Boolean).length ? (
          <p className={`mt-0.5 text-[#6B6560] ${compact ? "text-xs" : "text-sm"}`}>
            {[line.colorLabel, line.optionLabel].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {line.giftWrap ? (
          <p className={`mt-0.5 text-[#C47A2B] ${compact ? "text-[11px]" : "text-xs"}`}>
            Gift wrap +{formatInrFromPaise(GIFT_WRAP_PAISE)} / unit
          </p>
        ) : null}
        <div className={`mt-2 flex flex-wrap items-center gap-2 ${compact ? "text-sm" : ""}`}>
          <div className="flex items-center gap-1 rounded-full border border-[#E8E0D6] bg-white px-1">
            <button
              type="button"
              className="h-8 w-8 rounded-full text-lg leading-none text-[#3D3835] hover:bg-[#F5E6D0]"
              aria-label="Decrease quantity"
              onClick={() => onQty(line.id, Math.max(1, line.quantity - 1))}
            >
              −
            </button>
            <span className="min-w-[1.5rem] text-center text-xs font-semibold tabular-nums">{line.quantity}</span>
            <button
              type="button"
              disabled={atMax}
              title={atMax ? "Max stock reached" : undefined}
              className="h-8 w-8 rounded-full text-lg leading-none text-[#3D3835] hover:bg-[#F5E6D0] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Increase quantity"
              onClick={() => {
                if (!atMax) onQty(line.id, line.quantity + 1);
              }}
            >
              +
            </button>
          </div>
          <span className={`ml-auto font-semibold text-[#3D3835] ${compact ? "text-sm" : "text-base"}`}>
            {formatInrFromPaise(line.pricePaise * line.quantity + (line.giftWrap ? GIFT_WRAP_PAISE * line.quantity : 0))}
          </span>
        </div>
        {!compact ? (
          <p className="mt-1 text-xs text-[#6B6560]">{formatInrFromPaise(line.pricePaise)} each</p>
        ) : null}
        <button
          type="button"
          className="mt-1 text-xs font-medium text-rose-600 hover:underline"
          onClick={() => onRemove(line)}
        >
          Remove
        </button>
      </div>
    </li>
  );
}
