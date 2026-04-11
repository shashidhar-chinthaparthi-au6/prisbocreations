"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { CartProvider } from "@/components/cart/CartProvider";
import { NavigationProgress } from "@/components/NavigationProgress";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <CartProvider>{children}</CartProvider>
    </QueryClientProvider>
  );
}
