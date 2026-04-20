import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStoreSession } from "@/lib/auth/store-session";
import { safeRedirectPath } from "@/lib/auth/auth-schemas";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { AdminJwtLoginForm } from "@/components/auth/AdminJwtLoginForm";

export const metadata = { title: "Login" };

function LoginFallback() {
  return <div className="h-64 w-full max-w-[440px] animate-pulse rounded-2xl bg-white/70" aria-hidden />;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    redirect?: string;
    reset?: string;
    reason?: string;
    tab?: string;
    register?: string;
  }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "";
  const legacySession = await getStoreSession();
  const nextAuth = await auth();

  // Only send admins to the dashboard when they opened admin login (?next=/admin).
  // Storefront "Sign in" uses plain /login — those users should see customer Auth.js, not /admin.
  if (legacySession?.role === "admin" && next.startsWith("/admin")) {
    redirect(next);
  }
  // Match middleware: `/account` requires NextAuth, not legacy JWT alone.
  if (nextAuth?.user?.id) {
    const role = (nextAuth.user as { role?: string }).role ?? "customer";
    if (role === "customer") {
      redirect(safeRedirectPath(sp.redirect, "/account/orders"));
    }
  }

  const isAdminLogin = next.startsWith("/admin");

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center bg-[#FDFAF7] py-8">
      {isAdminLogin ? (
        <Suspense fallback={<LoginFallback />}>
          <AdminJwtLoginForm nextPath={next || "/admin"} />
        </Suspense>
      ) : (
        <AuthCard>
          <Suspense fallback={<LoginFallback />}>
            <LoginForm />
          </Suspense>
          {sp.tab === "register" || sp.register === "1" || sp.register === "true" ? (
            <p className="mt-6 text-center text-sm text-[#6B6560]">
              Registration has moved to{" "}
              <Link href="/register" className="font-medium text-[#C47A2B] hover:underline">
                Create account
              </Link>
              .
            </p>
          ) : null}
        </AuthCard>
      )}
    </div>
  );
}
