import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";

export const metadata = { title: "Admin · Orders" };

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-ink">Orders</h2>
      <AdminOrdersClient />
    </div>
  );
}
