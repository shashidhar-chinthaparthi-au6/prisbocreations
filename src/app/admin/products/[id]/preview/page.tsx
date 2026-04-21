import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { getAdminProductById } from "@/lib/services/adminCatalogBackend";
import { AdminBreadcrumb } from "@/components/admin/layout/AdminBreadcrumb";
import { ProductPageClient } from "@/components/product/ProductPageClient";
import { buildProductPageClientPropsFromDoc } from "@/lib/product-page-client-props";

export const metadata = { title: "Preview · Admin" };

export default async function AdminProductPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDb();
  const bundle = await getAdminProductById(id);
  if (!bundle?.product) notFound();

  const p = bundle.product;
  const slug = typeof p.slug === "string" ? p.slug.trim() : "";
  const clientProps = buildProductPageClientPropsFromDoc(p, bundle.category ?? null, bundle.subcategory ?? null);

  return (
    <div>
      <AdminBreadcrumb
        items={[
          { label: "Admin", href: "/admin/products" },
          { label: "Products", href: "/admin/products" },
          { label: "Preview" },
        ]}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3 gap-y-2">
        <Link href={`/admin/products/${id}/edit`} className="text-sm text-accent hover:underline">
          ← Edit
        </Link>
        {slug ?
          <Link
            href={`/products/${slug}`}
            className="text-sm text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open live storefront page ↗
          </Link>
        : null}
      </div>
      <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Storefront preview — matches the public product layout (including drafts that may not appear in
        shop listings yet).
      </p>
      <div className="-mx-4 rounded-xl border border-zinc-200 bg-[#f5f4ef] p-4 shadow-inner md:-mx-8 md:p-6">
        <ProductPageClient {...clientProps} adminPreview />
      </div>
    </div>
  );
}
