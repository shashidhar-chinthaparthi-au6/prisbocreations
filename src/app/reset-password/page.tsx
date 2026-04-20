import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center bg-[#FDFAF7] py-8">
      <AuthCard maxWidthClass="max-w-[440px]">
        <ResetPasswordForm />
      </AuthCard>
    </div>
  );
}
