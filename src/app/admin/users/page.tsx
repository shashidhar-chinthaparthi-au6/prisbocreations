import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export const metadata = { title: "Admin · Users" };

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-ink">Users</h2>
      <AdminUsersClient />
    </div>
  );
}
