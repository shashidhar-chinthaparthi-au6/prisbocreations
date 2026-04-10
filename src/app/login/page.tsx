import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-sand-deep bg-white p-8 shadow-sm">
      <div>
        <h1 className="font-display text-2xl text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-muted">Sign in to track orders and checkout faster.</p>
      </div>
      <LoginForm nextPath={sp.next ?? "/account"} />
      <p className="text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href="/register" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
