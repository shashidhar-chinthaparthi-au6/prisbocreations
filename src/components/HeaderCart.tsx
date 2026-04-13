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
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-sand-deep bg-white/90 text-ink shadow-sm transition hover:border-accent hover:text-accent"
      aria-label={count > 0 ? `Shopping cart, ${count} items` : "Shopping cart"}
    >
      <CartIcon className="h-5 w-5" />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white shadow">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
