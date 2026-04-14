"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch-client";
import type { MeUserDto } from "@/lib/user-me-dto";
import { UserAvatar } from "@/components/account/UserAvatar";

export function HeaderProfile() {
  const [user, setUser] = useState<MeUserDto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [avatarReloadToken, setAvatarReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiFetch<{ user: MeUserDto }>("/api/v1/auth/me");
        if (!cancelled) setUser(data.user);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load profile");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onProfileUpdated() {
      setAvatarReloadToken((n) => n + 1);
      void (async () => {
        try {
          const data = await apiFetch<{ user: MeUserDto }>("/api/v1/auth/me");
          setUser(data.user);
          setErr(null);
        } catch {
          /* keep existing avatar */
        }
      })();
    }
    window.addEventListener("prisbocreations:profile-updated", onProfileUpdated);
    return () => window.removeEventListener("prisbocreations:profile-updated", onProfileUpdated);
  }, []);

  if (err) {
    return (
      <Link
        href="/account"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-sand-deep bg-white/80 px-2 text-xs font-medium text-rose hover:bg-white"
        title="Account"
      >
        !
      </Link>
    );
  }

  if (!user) {
    return (
      <span
        className="inline-block h-11 w-11 shrink-0 animate-pulse rounded-full bg-sand-deep/40"
        aria-hidden
      />
    );
  }

  return (
    <Link
      href="/account"
      className="inline-flex min-h-11 shrink-0 items-center rounded-full p-0.5 hover:bg-white/50"
      title={`${user.name} — Profile & addresses`}
    >
      <UserAvatar
        name={user.name}
        imageUrl={user.profileImageUrl}
        size="md"
        preferProfileImageApi
        imageReloadToken={avatarReloadToken > 0 ? avatarReloadToken : undefined}
      />
    </Link>
  );
}
