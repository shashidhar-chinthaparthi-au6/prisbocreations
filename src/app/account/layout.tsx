import { redirect } from "next/navigation";
import { connectDb } from "@/lib/db";
import { getStoreSession } from "@/lib/auth/store-session";
import { loadMeUserDto } from "@/lib/services/meUserLoader";
import { AccountLayoutShell } from "@/components/account/AccountLayout";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getStoreSession();
  if (!session) redirect("/login?redirect=/account");

  await connectDb();
  const user = await loadMeUserDto(session.sub);
  if (!user) redirect("/login");

  return <AccountLayoutShell initialUser={user}>{children}</AccountLayoutShell>;
}
