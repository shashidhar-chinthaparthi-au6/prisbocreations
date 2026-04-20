"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/account/orders", label: "Orders" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/password", label: "Password" },
  { href: "/account/notifications", label: "Notifications" },
] as const;

export function AccountMobileNav() {
  const path = usePathname() ?? "";

  const homeActive = path === "/";

  return (
    <div className="-mx-1 overflow-x-auto pb-1 md:hidden">
      <div className="flex min-w-min gap-1 px-1">
        <Link
          href="/"
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
            homeActive
              ? "bg-[var(--brand-amber-light)] text-[var(--brand-amber-dark)]"
              : "text-[var(--brand-muted)] hover:bg-[var(--brand-surface)]"
          }`}
        >
          Home
        </Link>
        {NAV.map((item) => {
          const active = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                active
                  ? "bg-[var(--brand-amber-light)] text-[var(--brand-amber-dark)]"
                  : "text-[var(--brand-muted)] hover:bg-[var(--brand-surface)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
