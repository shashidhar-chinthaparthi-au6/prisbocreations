"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

export function HeaderCart() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="relative rounded-full border border-sand-deep px-3 py-1.5 text-sm text-ink hover:border-accent"
    >
      Cart{count > 0 ? <span className="ml-1 text-accent">({count})</span> : null}
    </Link>
  );
}
