import { AdminSubcategoriesClient } from "@/components/admin/AdminSubcategoriesClient";

export const metadata = { title: "Admin · Subcategories" };

export default function AdminSubcategoriesPage() {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-ink">Subcategories</h2>
      <AdminSubcategoriesClient />
    </div>
  );
}
