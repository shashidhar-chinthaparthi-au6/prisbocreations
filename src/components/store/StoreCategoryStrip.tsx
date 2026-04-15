import Link from "next/link";
import { connectDb } from "@/lib/db";
import { listCategories } from "@/lib/services/catalogService";

/**
 * Horizontal “top categories” row (marketplace-style), streamed via Suspense from the header.
 */
export async function StoreCategoryStrip() {
  await connectDb();
  const categories = await listCategories();
  if (categories.length === 0) return null;

  return (
    <nav
      className="border-t border-slate-100 bg-white"
      aria-label="Shop by category"
    >
      <div className="flex items-stretch gap-0 overflow-x-auto px-[max(0.75rem,env(safe-area-inset-left))] py-2 pr-[max(0.75rem,env(safe-area-inset-right))] [-ms-overflow-style:none] [scrollbar-width:none] sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] lg:px-8 [&::-webkit-scrollbar]:hidden">
        <Link
          href="/categories"
          className="inline-flex shrink-0 items-center border-b-2 border-accent px-2.5 py-1.5 text-xs font-semibold text-slate-900 sm:px-3 sm:text-sm"
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={String(c._id)}
            href={`/category/${c.slug}`}
            className="inline-flex shrink-0 items-center border-b-2 border-transparent px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:px-3 sm:text-sm"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
