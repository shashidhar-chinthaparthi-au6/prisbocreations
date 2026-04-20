import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { Category } from "@/lib/models/Category";
import { Subcategory } from "@/lib/models/Subcategory";
import { SchemaBuilderClient } from "@/components/admin/schema/SchemaBuilderClient";
import mongoose from "mongoose";

export const metadata = { title: "Schema · Admin" };

export default async function AdminSchemaPage({
  params,
}: {
  params: Promise<{ subcatId: string }>;
}) {
  const { subcatId } = await params;
  if (!mongoose.isValidObjectId(subcatId)) notFound();
  await connectDb();
  const sub = await Subcategory.findById(subcatId).lean();
  if (!sub) notFound();
  const cat = await Category.findById(sub.categoryId).lean();
  return (
    <SchemaBuilderClient
      subcategoryId={subcatId}
      categoryName={cat?.name ?? "Category"}
      subName={sub.name}
    />
  );
}
