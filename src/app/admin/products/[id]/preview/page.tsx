import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { getAdminProductById } from "@/lib/services/adminCatalogBackend";
import { sanitizeProductDescription } from "@/lib/sanitize-html";
import { AdminBreadcrumb } from "@/components/admin/layout/AdminBreadcrumb";

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
  const html = sanitizeProductDescription(typeof p.description === "string" ? p.description : "");
  return (
    <div>
      <AdminBreadcrumb
        items={[
          { label: "Admin", href: "/admin/products" },
          { label: "Products", href: "/admin/products" },
          { label: "Preview" },
        ]}
      />
      <div className="mb-4 flex gap-3">
        <Link href={`/admin/products/${id}/edit`} className="text-sm text-accent hover:underline">
          ← Edit
        </Link>
        {typeof p.slug === "string" && p.slug ?
          <Link href={`/product/${p.slug}`} className="text-sm text-accent hover:underline">
            Open live page ↗
          </Link>
        : null}
      </div>
      <h1 className="mb-2 text-2xl font-semibold">{p.name}</h1>
      <p className="mb-6 text-sm text-zinc-500">SKU {String(p.sku ?? p.skuBase ?? "")}</p>
      <div
        className="prose prose-sm max-w-none text-zinc-800"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
