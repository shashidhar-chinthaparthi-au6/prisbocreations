import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import {
  getCategoryBySlug,
  getSubcategoryByCategoryAndSlug,
  listProducts,
} from "@/lib/services/catalogService";
import {
  SubcategoryProductListing,
  type ListingProduct,
} from "@/components/category/SubcategoryProductListing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
}) {
  const { slug, subSlug } = await params;
  await connectDb();
  const sub = await getSubcategoryByCategoryAndSlug(slug, subSlug);
  return { title: sub?.name ?? "Products" };
}

function serializeProducts(products: Awaited<ReturnType<typeof listProducts>>): ListingProduct[] {
  return products.map((p) => ({
    _id: String(p._id),
    slug: p.slug,
    name: p.name,
    sku: p.sku,
    pricePaise: p.pricePaise,
    stock: p.stock,
    images: p.images ?? [],
  }));
}

export default async function SubcategoryProductsPage({
  params,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
}) {
  const { slug, subSlug } = await params;
  await connectDb();
  const cat = await getCategoryBySlug(slug);
  const sub = await getSubcategoryByCategoryAndSlug(slug, subSlug);
  if (!cat || !sub) notFound();

  const products = await listProducts({ categorySlug: slug, subcategorySlug: subSlug });
  const listing = serializeProducts(products);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-accent">
          <Link href="/categories">Categories</Link> /{" "}
          <Link href={`/category/${slug}`}>{cat.name}</Link> / {sub.name}
        </p>
        <h1 className="mt-2 font-display text-3xl text-ink">{sub.name}</h1>
        {sub.description ? (
          <p className="mt-2 max-w-2xl text-ink-muted">{sub.description}</p>
        ) : null}
        <p className="mt-2 text-sm text-ink-muted">
          Switch between list and grid. Add to cart here or open a product for full details.
        </p>
      </div>

      {!products.length ? (
        <p className="text-ink-muted">No products in this subcategory yet.</p>
      ) : (
        <SubcategoryProductListing products={listing} />
      )}

      <Link href={`/category/${slug}`} className="text-sm text-accent hover:underline">
        ← All subcategories in {cat.name}
      </Link>
    </div>
  );
}
