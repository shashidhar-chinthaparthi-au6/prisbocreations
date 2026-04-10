import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { getProductBreadcrumb } from "@/lib/services/catalogService";
import { formatInrFromPaise } from "@/lib/format";
import { AddToCart } from "@/components/product/AddToCart";
import { StoreMedia } from "@/components/store/StoreMedia";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connectDb();
  const nav = await getProductBreadcrumb(slug);
  return { title: nav?.product.name ?? "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connectDb();
  const nav = await getProductBreadcrumb(slug);
  if (!nav?.product) notFound();

  const { product: p, category: cat, subcategory: sub } = nav;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-sand-deep bg-sand-deep">
          {p.images[0] ? (
            <StoreMedia src={p.images[0]} alt={p.name} fill className="object-cover" priority />
          ) : null}
        </div>
        {p.images.length > 1 ? (
          <div className="grid grid-cols-4 gap-2">
            {p.images.slice(1, 5).map((src) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-lg bg-sand-deep">
                <StoreMedia
                  src={src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="120px"
                  videoControls={false}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="space-y-6">
        {cat && sub ? (
          <p className="text-sm text-ink-muted">
            <Link href="/categories" className="hover:text-accent">
              Categories
            </Link>{" "}
            /{" "}
            <Link href={`/category/${cat.slug}`} className="hover:text-accent">
              {cat.name}
            </Link>{" "}
            /{" "}
            <Link href={`/category/${cat.slug}/${sub.slug}`} className="hover:text-accent">
              {sub.name}
            </Link>
          </p>
        ) : null}
        <div>
          <p className="text-sm text-ink-muted">SKU {p.sku}</p>
          <h1 className="font-display text-3xl text-ink">{p.name}</h1>
          <p className="mt-3 text-2xl font-semibold text-ink">{formatInrFromPaise(p.pricePaise)}</p>
          <p className="mt-2 text-sm text-ink-muted">In stock: {p.stock}</p>
        </div>
        <p className="leading-relaxed text-ink-muted">{p.description}</p>
        {p.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {p.tags.map((t) => (
              <span key={t} className="rounded-full bg-sand-deep px-3 py-1 text-xs text-ink-muted">
                {t}
              </span>
            ))}
          </div>
        ) : null}
        <AddToCart
          product={{
            id: String(p._id),
            slug: p.slug,
            name: p.name,
            pricePaise: p.pricePaise,
            image: p.images[0],
          }}
        />
        {cat && sub ? (
          <Link
            href={`/category/${cat.slug}/${sub.slug}`}
            className="text-sm text-accent hover:underline"
          >
            ← Back to {sub.name}
          </Link>
        ) : (
          <Link href="/categories" className="text-sm text-accent hover:underline">
            ← Back to shop
          </Link>
        )}
      </div>
    </div>
  );
}
