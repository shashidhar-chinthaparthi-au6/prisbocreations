import { redirect } from "next/navigation";
import { getStoreSession } from "@/lib/auth/store-session";
import { connectDb } from "@/lib/db";
import { getUserById } from "@/lib/services/authService";
import { userDocToMeDto } from "@/lib/user-me-dto";
import { AccountProfileClient } from "@/components/account/AccountProfileClient";

export const metadata = { title: "Profile" };

export default async function AccountProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const sp = await searchParams;
  const session = await getStoreSession();
  if (!session) redirect("/login?redirect=/account/profile");

  await connectDb();
  const user = await getUserById(session.sub);
  if (!user) redirect("/login");

  const initialUser = userDocToMeDto(user);

  return (
    <AccountProfileClient initialUser={initialUser} deniedAdmin={sp.denied === "admin"} />
  );
}
