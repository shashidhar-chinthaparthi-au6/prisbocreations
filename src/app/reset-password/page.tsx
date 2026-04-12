import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-sand-deep bg-white p-8 shadow-sm">
      <div>
        <h1 className="font-display text-2xl text-ink">Set a new password</h1>
        <p className="mt-1 text-sm text-ink-muted">Choose a password at least 8 characters long.</p>
      </div>
      <ResetPasswordForm />
      <p className="text-center text-sm text-ink-muted">
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
