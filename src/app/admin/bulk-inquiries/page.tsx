import { AdminBulkInquiriesClient } from "@/components/admin/AdminBulkInquiriesClient";

export const metadata = { title: "Admin · Bulk Inquiries" };

export default function AdminBulkInquiriesPage() {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-ink">Bulk Inquiries</h2>
      <AdminBulkInquiriesClient />
    </div>
  );
}
