"use client";

import { useCart } from "@/components/cart/CartProvider";

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

export function HeaderCart() {
  const { count, setDrawerOpen } = useCart();
  return (
    <button
      type="button"
      onClick={() => setDrawerOpen(true)}
      className="relative inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-2 text-[var(--brand-ink)] hover:bg-[var(--brand-ink)]/5 sm:px-2.5"
      aria-label={count > 0 ? `Open bag, ${count} items` : "Open bag"}
    >
      <span className="hidden text-[14px] font-medium sm:inline">Bag</span>
      <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full border border-[var(--brand-ink)]/25 px-1 text-[11px] font-medium leading-none tabular-nums">
        {count > 99 ? "99" : count}
      </span>
      <CartIcon className="h-[18px] w-[18px] shrink-0 sm:hidden" />
    </button>
  );
}
