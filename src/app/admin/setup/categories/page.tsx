import { CategoriesPageClient } from "@/components/admin/categories/CategoriesPageClient";
import { AdminBreadcrumb } from "@/components/admin/layout/AdminBreadcrumb";

export const metadata = { title: "Categories · Admin" };

export default function AdminCategoriesSetupPage() {
  return (
    <div>
      <AdminBreadcrumb
        items={[
          { label: "Admin", href: "/admin/products" },
          { label: "Setup" },
          { label: "Categories" },
        ]}
      />
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Category manager</h1>
      <CategoriesPageClient />
    </div>
  );
}
