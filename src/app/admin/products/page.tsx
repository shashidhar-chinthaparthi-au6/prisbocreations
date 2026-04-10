import { AdminProductsClient } from "@/components/admin/AdminProductsClient";

export const metadata = { title: "Admin · Products" };

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-ink">Products</h2>
      <AdminProductsClient />
    </div>
  );
}
