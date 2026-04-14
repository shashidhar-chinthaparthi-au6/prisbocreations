"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch-client";
import type { MeUserDto } from "@/lib/user-me-dto";
import { UserAvatar } from "@/components/account/UserAvatar";
import { LogoutButton } from "@/components/auth/LogoutButton";

const MENU_MIN_PX = 200;
const MENU_GAP_PX = 6;

export function HeaderProfile() {
  const [user, setUser] = useState<MeUserDto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [avatarReloadToken, setAvatarReloadToken] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useLayoutEffect(() => {
    if (!open || !mounted) {
      setMenuStyle(null);
      return;
    }
    function place() {
      const trigger = rootRef.current;
      if (!trigger) return;
      const r = trigger.getBoundingClientRect();
      const width = MENU_MIN_PX;
      let left = r.right - width;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      setMenuStyle({ top: r.bottom + MENU_GAP_PX, left, width });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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

  const menuPanel =
    open && menuStyle && mounted ? (
      <div
        ref={menuRef}
        role="menu"
        aria-label="Account"
        style={{
          position: "fixed",
          top: menuStyle.top,
          left: menuStyle.left,
          width: menuStyle.width,
          zIndex: 70,
        }}
        className="overflow-hidden rounded-xl border border-sand-deep bg-white py-1 shadow-lg ring-1 ring-ink/5"
      >
        <Link
          href="/account"
          role="menuitem"
          className="block px-3 py-2.5 text-sm font-medium text-ink hover:bg-sand/60"
          onClick={() => setOpen(false)}
        >
          Profile
        </Link>
        <div className="mx-2 border-t border-sand-deep/70" />
        <div className="px-1 py-0.5">
          <LogoutButton variant="menu" />
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${user.name}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full p-0.5 ring-offset-2 ring-offset-sand/90 hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <UserAvatar
          name={user.name}
          imageUrl={user.profileImageUrl}
          size="md"
          preferProfileImageApi
          imageReloadToken={avatarReloadToken > 0 ? avatarReloadToken : undefined}
        />
      </button>
      {menuPanel ? createPortal(menuPanel, document.body) : null}
    </div>
  );
}
