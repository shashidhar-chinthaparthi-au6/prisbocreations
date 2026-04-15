"use client";

import Link from "next/link";
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
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="relative inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-slate-800 shadow-sm transition hover:border-accent/60 hover:text-accent sm:min-h-11 sm:min-w-0 sm:px-3"
        aria-label={count > 0 ? `Open cart, ${count} items` : "Open cart"}
      >
        <CartIcon className="h-5 w-5 shrink-0" />
        <span className="hidden text-xs font-semibold sm:inline">Cart</span>
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white shadow">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>
      <Link
        href="/cart"
        className="hidden min-h-11 items-center rounded-md px-1.5 text-xs font-medium text-slate-500 underline-offset-2 hover:text-accent lg:inline-flex"
      >
        View bag
      </Link>
    </div>
  );
}
