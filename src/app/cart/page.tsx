import Link from "next/link";
import Image from "next/image";
import { CartClient } from "@/components/cart/CartClient";

export const metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-ink">Your cart</h1>
      <CartClient />
      <Link href="/categories" className="text-sm text-accent hover:underline">
        Continue shopping
      </Link>
    </div>
  );
}
