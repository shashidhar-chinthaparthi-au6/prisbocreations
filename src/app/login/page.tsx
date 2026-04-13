import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  const secret = process.env.JWT_SECRET;
  const session = secret ? await getSession(secret) : null;

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-sand-deep bg-white p-8 shadow-sm">
      <div>
        <h1 className="font-display text-2xl text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-muted">Sign in to track orders and checkout faster.</p>
      </div>
      {sp.reason === "session_expired" ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Your session ended; please sign in again.
        </p>
      ) : null}
      {sp.reset ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Your password was updated. Sign in with your new password.
        </p>
      ) : null}
      <LoginForm nextPath={sp.next ?? "/account"} />
      {!session ? (
        <p className="text-center text-sm text-ink-muted">
          New here?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Create an account
          </Link>
        </p>
      ) : null}
    </div>
  );
}
