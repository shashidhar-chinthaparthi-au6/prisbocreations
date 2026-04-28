"use client";

import { usePathname } from "next/navigation";
import { StoreShell } from "@/components/storefront/StoreShell";

export function ConditionalStoreShell({
  assistantEnabled,
  children,
}: {
  assistantEnabled?: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname() ?? "";
  if (path.startsWith("/admin")) {
    return <>{children}</>;
  }
  return <StoreShell assistantEnabled={assistantEnabled !== false}>{children}</StoreShell>;
}
