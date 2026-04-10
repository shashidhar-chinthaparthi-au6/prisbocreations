import Link from "next/link";
import { connectDb } from "@/lib/db";
import { listCategories } from "@/lib/services/catalogService";

export default async function HomePage() {
  await connectDb();
  const categories = await listCategories();

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-ink to-rose px-8 py-16 text-white shadow-xl md:px-14 md:py-20">
        <div className="relative z-10 max-w-2xl space-y-6">
          <p className="text-sm uppercase tracking-[0.2em] text-white/70">Prisbo Creations</p>
          <h1 className="font-display text-4xl leading-tight md:text-5xl">
            Personalized pieces that feel unmistakably premium.
          </h1>
          <p className="text-lg text-white/85">
            From acrylic keepsakes to packaging that elevates your brand — every order is produced
            with care and crisp detail.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/categories"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink hover:bg-sand"
            >
              Browse categories
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Create account
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-ink md:text-3xl">Shop by category</h2>
            <p className="mt-1 text-sm text-ink-muted">Curated collections for every moment.</p>
          </div>
          <Link href="/categories" className="text-sm font-medium text-accent hover:underline">
            View all
          </Link>
        </div>
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-deep bg-white/60 p-10 text-center text-ink-muted">
            <p className="font-medium text-ink">No categories in the database yet.</p>
            <p className="mt-2 text-sm">
              Confirm <code className="rounded bg-sand px-1.5 py-0.5 text-ink">MONGODB_URI</code> in{" "}
              <code className="rounded bg-sand px-1.5 py-0.5 text-ink">.env.local</code>, then run{" "}
              <code className="rounded bg-sand px-1.5 py-0.5 text-ink">npm run seed</code>
              , or add categories from the admin dashboard.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={String(c._id)}
                href={`/category/${c.slug}`}
                className="group overflow-hidden rounded-2xl border border-sand-deep bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-sand-deep">
                  {c.images?.[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- category URLs may be any host (admin) */
                    <img
                      src={c.images[0]}
                      alt={c.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-sm text-ink-muted"
                      aria-hidden
                    >
                      No image
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-5">
                  <h3 className="font-display text-lg text-ink group-hover:text-accent">{c.name}</h3>
                  <p className="line-clamp-2 text-sm text-ink-muted">{c.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
