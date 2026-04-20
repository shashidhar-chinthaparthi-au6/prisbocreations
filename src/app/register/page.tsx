import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getStoreSession } from "@/lib/auth/store-session";
import { safeRedirectPath } from "@/lib/auth/auth-schemas";
import { AuthCard } from "@/components/auth/AuthCard";
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
  const session = await getStoreSession();
  if (session) {
    redirect(safeRedirectPath(sp.redirect, "/account/orders"));
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center bg-[#FDFAF7] py-8">
      <AuthCard maxWidthClass="max-w-[480px]">
        <Suspense fallback={<RegisterFallback />}>
          <RegisterForm />
        </Suspense>
      </AuthCard>
    </div>
  );
}
