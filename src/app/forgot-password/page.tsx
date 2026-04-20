import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center bg-[#FDFAF7] py-8">
      <AuthCard maxWidthClass="max-w-[420px]">
        <Link
          href="/login"
          className="mb-6 inline-flex text-[13px] text-[#6B6560] hover:text-[#1A1A1A]"
        >
          ← Back to login
        </Link>
        <ForgotPasswordForm />
      </AuthCard>
    </div>
  );
}
