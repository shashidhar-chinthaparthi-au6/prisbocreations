"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { MeUserDto } from "@/lib/user-me-dto";
import { AccountHeader } from "./AccountHeader";

const NAV = [
  { href: "/account/orders", label: "Orders" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/password", label: "Password" },
  { href: "/account/notifications", label: "Notifications" },
] as const;

export function AccountSidebar({ user }: { user: MeUserDto }) {
  const path = usePathname() ?? "";

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-[var(--brand-border)] bg-[var(--brand-card)] py-6 pr-4">
      <AccountHeader
        user={{
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          avatarInitials: user.avatarInitials,
          createdAt: user.createdAt,
        }}
      />
      <div className="my-4 border-t border-[var(--brand-border)]" />
      <nav className="flex flex-col gap-0.5 text-sm" aria-label="Account sections">
        <Link
          href="/"
          className="rounded-r-lg border-l-[3px] border-transparent px-3 py-2.5 font-medium text-[var(--brand-ink)] transition-colors hover:bg-[var(--brand-surface)]"
        >
          Home
        </Link>
        {NAV.map((item) => {
          const active = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-r-lg px-3 py-2.5 font-medium transition-colors ${
                active
                  ? "border-l-[3px] border-[var(--brand-amber)] bg-[var(--brand-amber-light)] text-[var(--brand-amber-dark)]"
                  : "border-l-[3px] border-transparent text-[var(--brand-ink)] hover:bg-[var(--brand-surface)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="my-4 border-t border-[var(--brand-border)]" />
      <button
        type="button"
        className="px-3 py-2 text-left text-sm text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
        onClick={() => void signOut({ callbackUrl: "/" })}
      >
        Sign out
      </button>
    </aside>
  );
}
