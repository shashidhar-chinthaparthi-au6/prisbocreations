import Link from "next/link";

const RECIPIENTS = [
  { href: "/search?q=for+him", label: "For him", tone: "from-slate-800 to-slate-950" },
  { href: "/search?q=for+her", label: "For her", tone: "from-rose-900 to-rose-950" },
  { href: "/search?q=for+kids", label: "For kids", tone: "from-amber-800 to-amber-950" },
  { href: "/search?q=for+couples", label: "For couples", tone: "from-violet-900 to-violet-950" },
] as const;

export function HomeShopByRecipient() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-xl text-ink md:text-2xl">Shop by recipient</h2>
        <p className="mt-1 text-sm text-ink-muted">Jump in by who you&apos;re shopping for.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RECIPIENTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className={`group flex aspect-square flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${r.tone} p-4 text-center text-white shadow-md ring-1 ring-white/15 transition hover:brightness-110 hover:ring-white/35`}
          >
            <span className="font-display text-lg font-semibold leading-tight sm:text-xl">{r.label}</span>
            <span className="mt-2 text-xs font-medium text-white/85 underline-offset-2 group-hover:underline">
              Browse
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
