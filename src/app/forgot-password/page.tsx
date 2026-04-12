import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-sand-deep bg-white p-8 shadow-sm">
      <div>
        <h1 className="font-display text-2xl text-ink">Forgot password</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Enter your account email. We&apos;ll send a one-time link to reset your password.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm text-ink-muted">
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
