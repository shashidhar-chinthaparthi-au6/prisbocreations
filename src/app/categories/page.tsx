import Link from "next/link";
import { connectDb } from "@/lib/db";
import { listCategories } from "@/lib/services/catalogService";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await connectDb();
  const categories = await listCategories();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">All categories</h1>
        <p className="mt-2 text-ink-muted">Explore our full range of personalized products.</p>
      </div>
      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-deep bg-white/60 p-10 text-center text-ink-muted">
          <p className="font-medium text-ink">No categories yet.</p>
          <p className="mt-2 text-sm">
            With MongoDB configured, run{" "}
            <code className="rounded bg-sand px-1.5 py-0.5 text-ink">npm run seed</code> or create
            categories in <Link href="/admin/categories" className="font-medium text-accent hover:underline">Admin → Categories</Link>.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {categories.map((c) => (
            <Link
              key={String(c._id)}
              href={`/category/${c.slug}`}
              className="flex overflow-hidden rounded-2xl border border-sand-deep bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative h-40 w-40 shrink-0 overflow-x-auto overflow-y-hidden bg-sand-deep">
                <div className="flex h-full snap-x snap-mandatory">
                  {(c.images?.length ? c.images : []).map((src) => (
                    <div
                      key={src}
                      className="relative h-40 w-40 shrink-0 snap-start"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- category URLs may be any host (admin) */}
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
                {!c.images?.length ? (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-ink-muted">
                    No image
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col justify-center p-5">
                <h2 className="font-display text-xl text-ink">{c.name}</h2>
                <p className="mt-1 line-clamp-3 text-sm text-ink-muted">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
