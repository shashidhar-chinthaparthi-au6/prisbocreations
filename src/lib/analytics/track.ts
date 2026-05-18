"use client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", eventName, params);
  window.fbq?.("trackCustom", eventName, params);
}

export function trackPurchase(data: {
  orderId: string;
  totalInr: number;
  currency?: string;
  items?: Array<{ id: string; name: string; quantity: number; price: number }>;
}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "purchase", {
    transaction_id: data.orderId,
    value: data.totalInr,
    currency: data.currency ?? "INR",
    items: data.items ?? [],
  });
  window.fbq?.("track", "Purchase", {
    value: data.totalInr,
    currency: data.currency ?? "INR",
    content_ids: data.items?.map((i) => i.id) ?? [],
    content_type: "product",
  });
}

export function trackAddToCart(data: {
  productId: string;
  name: string;
  price: number;
  currency?: string;
}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "add_to_cart", {
    currency: data.currency ?? "INR",
    value: data.price,
    items: [{ item_id: data.productId, item_name: data.name, price: data.price, quantity: 1 }],
  });
  window.fbq?.("track", "AddToCart", {
    content_ids: [data.productId],
    content_name: data.name,
    value: data.price,
    currency: data.currency ?? "INR",
  });
}

export function trackBeginCheckout(totalInr: number) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "begin_checkout", { value: totalInr, currency: "INR" });
  window.fbq?.("track", "InitiateCheckout", { value: totalInr, currency: "INR" });
}
