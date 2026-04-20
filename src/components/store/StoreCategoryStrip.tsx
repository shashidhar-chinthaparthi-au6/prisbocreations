import { connectDb } from "@/lib/db";
import { listNavCategoryTree } from "@/lib/services/catalogService";
import { StoreCategoryNav } from "@/components/store/StoreCategoryNav";

/**
 * Horizontal category row with subcategory dropdowns (hover on desktop, tap on small screens).
 */
export async function StoreCategoryStrip() {
  await connectDb();
  const tree = await listNavCategoryTree();
  if (tree.length === 0) return null;

  return <StoreCategoryNav categories={tree} />;
}
