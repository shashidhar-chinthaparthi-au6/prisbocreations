import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/layout/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) redirect("/login");
  const session = await getSession(secret);
  if (!session) {
    redirect("/login?next=/admin");
  }
  if (session.role !== "admin") {
    redirect("/account/profile?denied=admin");
  }

  return <AdminShell>{children}</AdminShell>;
}
