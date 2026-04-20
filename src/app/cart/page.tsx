import { CartClient } from "@/components/cart/CartClient";

export const metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-[#3D3835]">Your cart</h1>
      <CartClient />
    </div>
  );
}
