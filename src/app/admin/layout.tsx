import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { StudioAdmin } from "@/components/admin/studio/StudioAdmin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  void children;
  const secret = process.env.JWT_SECRET;
  if (!secret) redirect("/login");
  const session = await getSession(secret);
  if (!session) {
    redirect("/login?next=/admin");
  }
  if (session.role !== "admin") {
    redirect("/account/profile?denied=admin");
  }

  return <StudioAdmin />;
}
