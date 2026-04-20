"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { MeUserDto } from "@/lib/user-me-dto";
import { apiFetch } from "@/lib/api/fetch-client";
import { AccountSidebar } from "./AccountSidebar";
import { AccountMobileNav } from "./AccountMobileNav";
import { AccountHeader } from "./AccountHeader";

const AccountUserContext = createContext<MeUserDto | null>(null);

export function useAccountUser(): MeUserDto {
  const v = useContext(AccountUserContext);
  if (!v) throw new Error("useAccountUser must be used inside account layout");
  return v;
}

export function AccountLayoutShell({
  initialUser,
  children,
}: {
  initialUser: MeUserDto;
  children: ReactNode;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: MeUserDto }>("/api/v1/auth/me");
      setUser(data.user);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    function onProfileUpdated() {
      void refreshUser();
    }
    window.addEventListener("prisbocreations:profile-updated", onProfileUpdated);
    return () => window.removeEventListener("prisbocreations:profile-updated", onProfileUpdated);
  }, [refreshUser]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?redirect=${encodeURIComponent("/account/orders")}`);
    }
  }, [status, router]);

  return (
    <AccountUserContext.Provider value={user}>
      <div className="mx-auto flex min-h-[60vh] max-w-6xl gap-0 px-4 pb-16 pt-6 sm:px-6">
        <div className="hidden md:block">
          <AccountSidebar user={user} />
        </div>
        <div className="min-w-0 flex-1 md:pl-8">
          <div className="md:hidden">
            <AccountHeader user={user} compact />
            <div className="mt-4">
              <AccountMobileNav />
            </div>
            <div className="my-6 border-t border-[var(--brand-border)]" />
          </div>
          {children}
        </div>
      </div>
    </AccountUserContext.Provider>
  );
}
