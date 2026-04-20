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
      className="relative inline-flex h-11 shrink-0 items-center justify-center gap-1 rounded-full px-2 hover:bg-[var(--brand-amber-light)] sm:px-2.5"
      aria-label={count > 0 ? `Open cart, ${count} items` : "Open cart"}
    >
      <CartIcon className="h-[22px] w-[22px] shrink-0 text-[var(--brand-ink)]" />
      <span className="hidden text-[13px] font-medium text-[var(--brand-ink)] sm:inline">Cart</span>
      {count > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C47A2B] text-[9px] font-semibold leading-none text-white">
          {count > 99 ? "99" : count}
        </span>
      ) : null}
    </button>
  );
}
