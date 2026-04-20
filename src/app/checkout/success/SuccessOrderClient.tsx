"use client";

import { useEffect } from "react";
import { useCheckoutStore } from "@/lib/store/checkout-store";
import { useCartStore, computeCartTotals } from "@/lib/store/cart-store";

/** Clear checkout draft and cart store after a confirmed order (URL still shows success). */
export function SuccessOrderClient() {
  const resetCheckout = useCheckoutStore((s) => s.reset);

  useEffect(() => {
    resetCheckout();
    useCartStore.setState({ lines: [], ...computeCartTotals([]) });
  }, [resetCheckout]);

  return null;
}
