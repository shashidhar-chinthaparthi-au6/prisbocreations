const BENEFITS = [
  {
    title: "Premium acrylic",
    body: "Crisp edges and depth that reads as luxury, not plastic.",
    emoji: "✦",
  },
  {
    title: "Waterproof prints",
    body: "Made to survive spills, splashes, and daily handling.",
    emoji: "💧",
  },
  {
    title: "Eco-conscious packaging",
    body: "Thoughtful wraps and boxes — gift-ready by default.",
    emoji: "🌿",
  },
] as const;

export function HomeBrandBenefits() {
  return (
    <section className="rounded-2xl border border-sand-deep bg-gradient-to-br from-white via-sand/30 to-sand-deep/40 p-5 shadow-sm sm:p-7">
      <h2 className="font-display text-xl text-ink md:text-2xl">Why Prisbo</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Small-batch production with the finish your photos deserve.
      </p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <li
            key={b.title}
            className="rounded-xl border border-sand-deep/80 bg-white/80 px-4 py-4 shadow-sm"
          >
            <span className="text-2xl" aria-hidden>
              {b.emoji}
            </span>
            <p className="mt-2 font-display text-base font-semibold text-ink">{b.title}</p>
            <p className="mt-1 text-sm text-ink-muted">{b.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
