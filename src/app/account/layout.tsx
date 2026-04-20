import Link from "next/link";

const tabs = [
  { href: "/account/orders", label: "Orders" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/wishlist", label: "Wishlist" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <nav
        className="mb-8 flex gap-2 overflow-x-auto border-b border-[var(--brand-border)] pb-2 text-sm font-medium text-[var(--brand-muted)] lg:gap-4"
        aria-label="Account"
      >
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="whitespace-nowrap rounded-full px-3 py-2 hover:bg-[var(--brand-amber-light)] hover:text-[var(--brand-ink)]"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
