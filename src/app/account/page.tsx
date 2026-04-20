import { redirect } from "next/navigation";
import { getStoreSession } from "@/lib/auth/store-session";

export default async function AccountIndexPage() {
  const session = await getStoreSession();
  if (!session) redirect("/login?redirect=/account");
  redirect("/account/orders");
}
