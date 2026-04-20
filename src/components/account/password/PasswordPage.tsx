"use client";

import { PasswordChangeForm } from "./PasswordChangeForm";

/** Credentials-only accounts; extend when OAuth is added. */
export function PasswordPage() {
  return (
    <div className="mx-auto max-w-[480px] space-y-6">
      <h1 className="font-display text-2xl text-[var(--brand-ink)]">Change password</h1>
      <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-6 shadow-[var(--shadow-card)]">
        <PasswordChangeForm />
      </div>
    </div>
  );
}
