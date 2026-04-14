import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { getUserById } from "@/lib/services/authService";
import { userDocToMeDto } from "@/lib/user-me-dto";
import { AccountProfileClient } from "@/components/account/AccountProfileClient";

export const metadata = { title: "Account" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const sp = await searchParams;
  const secret = process.env.JWT_SECRET;
  if (!secret) redirect("/login");
  const session = await getSession(secret);
  if (!session) redirect("/login?next=/account");

  await connectDb();
  const user = await getUserById(session.sub);
  if (!user) redirect("/login");

  const initialUser = userDocToMeDto(user);

  return (
    <AccountProfileClient initialUser={initialUser} deniedAdmin={sp.denied === "admin"} />
  );
}
