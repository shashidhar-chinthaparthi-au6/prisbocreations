import { getSession } from "@/lib/auth/session";
import { SiteFooterClient } from "@/components/SiteFooterClient";

export async function SiteFooter() {
  const secret = process.env.JWT_SECRET;
  const session = secret ? await getSession(secret) : null;
  const isAdmin = session?.role === "admin";

  return <SiteFooterClient isAdmin={isAdmin} loggedIn={Boolean(session)} />;
}
