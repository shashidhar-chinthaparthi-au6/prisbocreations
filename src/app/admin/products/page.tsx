import { connectDb } from "@/lib/db";
import { Category } from "@/lib/models/Category";
import { ProductsPageClient } from "@/components/admin/product-list/ProductsPageClient";

export const metadata = { title: "Products · Admin" };

export default async function AdminProductsPage() {
  await connectDb();
  const cats = await Category.find().sort({ sortOrder: 1, name: 1 }).select("name").lean();
  const categoryChips = cats.map((c) => ({ id: String(c._id), name: c.name }));
  return <ProductsPageClient categoryChips={categoryChips} />;
}
