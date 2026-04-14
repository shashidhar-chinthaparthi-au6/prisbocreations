import { Suspense } from "react";
import { AuthPageShell, AuthPageShellFallback } from "@/components/auth/AuthPageShell";

export const metadata = { title: "Register" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <Suspense fallback={<AuthPageShellFallback />}>
      <AuthPageShell
        mode="register"
        nextPath={sp.next?.trim() || "/account"}
        initialTab="register"
      />
    </Suspense>
  );
}
