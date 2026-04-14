import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { AuthPageShell, AuthPageShellFallback } from "@/components/auth/AuthPageShell";

export const metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; reason?: string; tab?: string; register?: string }>;
}) {
  const sp = await searchParams;
  const secret = process.env.JWT_SECRET;
  const session = secret ? await getSession(secret) : null;

  const showRegister =
    sp.tab === "register" || sp.register === "1" || sp.register === "true";

  return (
    <Suspense fallback={<AuthPageShellFallback />}>
      <AuthPageShell
        mode="login"
        nextPath={sp.next ?? "/account"}
        initialTab={session ? "login" : showRegister ? "register" : "login"}
        sessionExpired={sp.reason === "session_expired"}
        passwordReset={Boolean(sp.reset)}
        suppressRegisterTab={Boolean(session)}
      />
    </Suspense>
  );
}
