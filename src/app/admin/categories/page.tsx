import { AdminCategoriesClient } from "@/components/admin/AdminCategoriesClient";

export const metadata = { title: "Admin · Categories" };

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-ink">Categories</h2>
      <AdminCategoriesClient />
    </div>
  );
}
