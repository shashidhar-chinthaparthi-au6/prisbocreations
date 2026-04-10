import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { getUserById } from "@/lib/services/authService";
import { LogoutButton } from "@/components/auth/LogoutButton";

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

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-sand-deep bg-white p-8 shadow-sm">
      {sp.denied === "admin" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span className="font-semibold">Admin area is restricted.</span> You are signed in as a
          customer. The storefront header only shows an &quot;Admin&quot; link for admin accounts.
          Use the admin user from your seed script (<code className="rounded bg-amber-100/80 px-1">SEED_ADMIN_EMAIL</code> /{" "}
          <code className="rounded bg-amber-100/80 px-1">SEED_ADMIN_PASSWORD</code> in{" "}
          <code className="rounded bg-amber-100/80 px-1">.env.local</code>), or ask the site owner to set your role to admin in the database.
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Account</h1>
          <p className="mt-1 text-sm text-ink-muted">Signed in as {user.email}</p>
        </div>
        <LogoutButton />
      </div>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-ink-muted">Name</dt>
          <dd className="font-medium text-ink">{user.name}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Role</dt>
          <dd className="font-medium capitalize text-ink">{user.role}</dd>
        </div>
        {user.phone ? (
          <div>
            <dt className="text-ink-muted">Phone</dt>
            <dd className="font-medium text-ink">{user.phone}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
