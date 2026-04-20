"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Suspense, useState } from "react";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { StoreToaster } from "@/components/store/StoreToaster";
import { SessionSync } from "@/components/layout/SessionSync";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <SessionProvider>
      <SessionSync />
      <QueryClientProvider client={client}>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <CartProvider>
          {children}
          <CartDrawer />
          <ScrollToTopButton />
          <StoreToaster />
        </CartProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
