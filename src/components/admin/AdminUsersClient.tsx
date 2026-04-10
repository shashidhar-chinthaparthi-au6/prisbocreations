"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch-client";

type UserRow = {
  _id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
};

export function AdminUsersClient() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch<UserRow[]>("/api/v1/admin/users"),
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-sand-deep bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-sand-deep bg-sand/50 text-xs uppercase text-ink-muted">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Joined</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-ink-muted">
                Loading…
              </td>
            </tr>
          ) : null}
          {users?.map((u) => (
            <tr key={u._id} className="border-b border-sand-deep/80">
              <td className="px-4 py-3">{u.email}</td>
              <td className="px-4 py-3">{u.name}</td>
              <td className="px-4 py-3 capitalize">{u.role}</td>
              <td className="px-4 py-3 text-xs text-ink-muted">
                {new Date(u.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
