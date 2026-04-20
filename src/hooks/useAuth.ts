"use client";

import { useSession } from "next-auth/react";

export function useAuth() {
  const { data, status } = useSession();
  return {
    user: data?.user ?? null,
    isLoggedIn: status === "authenticated",
    isLoading: status === "loading",
  };
}
