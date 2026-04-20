"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AccountDropdown } from "@/components/layout/AccountDropdown";
import { initialsFromFullName } from "@/lib/auth/display-name";

const GAP = 6;

function PersonOutlineIcon({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function HeaderAccountIcon() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useLayoutEffect(() => {
    if (!open || !mounted) {
      setMenuPos(null);
      return;
    }
    function place() {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const menuWidth = 220;
      let left = r.right - menuWidth;
      left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
      setMenuPos({ top: r.bottom + GAP, left });
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

  if (isLoading) {
    return (
      <span
        className="flex h-11 min-w-[44px] shrink-0 items-center justify-center rounded-full border border-[#E8E0D6] bg-[#FAF7F4] text-[#4A4540] animate-pulse"
        aria-busy="true"
        aria-label="Loading account"
      >
        <PersonOutlineIcon className="opacity-80" />
      </span>
    );
  }

  if (!isLoggedIn || !user?.email) {
    return (
      <Link
        href="/login"
        title="Sign in"
        className="flex h-11 min-w-[44px] items-center justify-center rounded-full text-[#1A1A1A] hover:bg-[#F5E6D0]"
        aria-label="Sign in"
      >
        <PersonOutlineIcon />
      </Link>
    );
  }

  const fullName = user.name ?? "Account";
  const initials = initialsFromFullName(fullName);

  const menu =
    open && menuPos && mounted ? (
      <div
        ref={menuRef}
        style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 200 }}
        className="animate-in fade-in zoom-in-95 duration-100"
      >
        <AccountDropdown fullName={fullName} email={user.email} onClose={() => setOpen(false)} />
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        title={fullName}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${fullName}`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D0] text-[11px] font-semibold text-[#C47A2B] ring-2 ring-transparent hover:ring-[#C47A2B]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A2B]"
      >
        {initials}
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
