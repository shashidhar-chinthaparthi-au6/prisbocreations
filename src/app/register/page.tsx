import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { safeRedirectPath } from "@/lib/auth/auth-schemas";
import { RegisterCard } from "@/components/auth/RegisterCard";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "Create account" };

function RegisterFallback() {
  return <div className="h-72 w-full max-w-[480px] animate-pulse rounded-2xl bg-white/70" aria-hidden />;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const sp = await searchParams;
  /** Only NextAuth protects `/account` in middleware; legacy `prisbo_session` alone must not skip registration. */
  const na = await auth();
  if (na?.user?.id) {
    redirect(safeRedirectPath(sp.redirect, "/"));
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center bg-[#FDFAF7] py-8">
      <RegisterCard>
        <Suspense fallback={<RegisterFallback />}>
          <RegisterForm />
        </Suspense>
      </RegisterCard>
    </div>
  );
}
