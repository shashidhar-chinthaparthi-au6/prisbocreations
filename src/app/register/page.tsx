import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-sand-deep bg-white p-8 shadow-sm">
      <div>
        <h1 className="font-display text-2xl text-ink">Join Prisbo</h1>
        <p className="mt-1 text-sm text-ink-muted">Create an account to save addresses and orders.</p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
