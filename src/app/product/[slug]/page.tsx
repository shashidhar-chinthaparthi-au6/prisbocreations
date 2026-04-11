import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { getProductBreadcrumb } from "@/lib/services/catalogService";
import { sanitizeProductDescription } from "@/lib/sanitize-html";
import { ProductPurchaseClient } from "@/components/product/ProductPurchaseClient";
import { ProductGallery } from "@/components/product/ProductGallery";

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
  const descriptionHtml = sanitizeProductDescription(
    typeof p.description === "string" ? p.description : "",
  );
  const cartOptions = Array.isArray(p.options)
    ? p.options.map((o) => ({
        key: o.key,
        label: o.label,
        pricePaise: o.pricePaise,
        stock: o.stock,
      }))
    : undefined;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <ProductGallery images={p.images} productName={p.name} />
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
          <ProductPurchaseClient
            product={{
              id: String(p._id),
              slug: p.slug,
              name: p.name,
              pricePaise: p.pricePaise,
              stock: p.stock,
              image: p.images[0],
              options: cartOptions?.length ? cartOptions : undefined,
            }}
          >
            <div
              className="prose prose-slate mt-6 max-w-none leading-relaxed text-ink-muted prose-headings:font-display prose-headings:text-ink prose-p:text-ink-muted prose-strong:text-ink prose-li:text-ink-muted prose-blockquote:border-sand-deep prose-blockquote:text-ink-muted prose-a:text-accent"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
            {p.tags?.length ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-sand-deep px-3 py-1 text-xs text-ink-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </ProductPurchaseClient>
        </div>
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
