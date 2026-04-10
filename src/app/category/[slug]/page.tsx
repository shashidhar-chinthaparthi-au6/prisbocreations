import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import {
  getCategoryBySlug,
  listSubcategoriesByCategorySlug,
  listPreviewImagesForSubcategory,
} from "@/lib/services/catalogService";
import { SubcategoryCard } from "@/components/category/SubcategoryCard";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connectDb();
  const cat = await getCategoryBySlug(slug);
  return { title: cat?.name ?? "Category" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connectDb();
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();
  const subcategories = await listSubcategoriesByCategorySlug(slug);

  const subsWithImages = await Promise.all(
    subcategories.map(async (s) => {
      const imageUrls = await listPreviewImagesForSubcategory(String(s._id), {
        subcategoryImages: s.images,
        categoryImages: cat.images,
      });
      return { sub: s, imageUrls };
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-accent">
          <Link href="/categories">Categories</Link> / {cat.name}
        </p>
        <h1 className="mt-2 font-display text-3xl text-ink">{cat.name}</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">{cat.description}</p>
        <p className="mt-3 text-sm text-ink-muted">
          Choose a subcategory — swipe or scroll the images, then open to see all products and prices.
        </p>
      </div>

      {!subcategories.length ? (
        <div className="rounded-2xl border border-dashed border-sand-deep bg-white/80 p-10 text-center text-ink-muted">
          <p>No subcategories yet for this category.</p>
          <p className="mt-2 text-sm">
            Run <code className="rounded bg-sand px-1.5 py-0.5 text-ink">npm run seed</code> or add
            subcategories in{" "}
            <Link href="/admin/subcategories" className="font-medium text-accent hover:underline">
              Admin → Subcategories
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subsWithImages.map(({ sub: s, imageUrls }) => (
            <SubcategoryCard
              key={String(s._id)}
              href={`/category/${slug}/${s.slug}`}
              name={s.name}
              description={s.description}
              imageUrls={imageUrls}
            />
          ))}
        </div>
      )}
    </div>
  );
}
