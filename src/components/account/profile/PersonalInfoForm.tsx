"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import { Spinner } from "@/components/ui/Spinner";
import { dispatchStoreToast } from "@/components/store/StoreToaster";

export type ProfileFormData = {
  fullName: string;
  email: string;
  phone: string;
};

export function PersonalInfoForm({
  initial,
  serverEmail,
  onSaved,
}: {
  initial: ProfileFormData;
  serverEmail: string;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(initial.fullName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [emailBanner, setEmailBanner] = useState(false);

  useEffect(() => {
    setFullName(initial.fullName);
    setEmail(initial.email);
    setPhone(initial.phone);
  }, [initial.fullName, initial.email, initial.phone]);

  const emailTouched = email.trim().toLowerCase() !== serverEmail.trim().toLowerCase();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setEmailErr(null);
    setEmailBanner(false);

    const em = email.trim().toLowerCase();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setEmailErr("Enter a valid email address");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
        }),
      });

      if (emailTouched && em) {
        await apiFetch("/api/account/email-change-request", {
          method: "POST",
          body: JSON.stringify({ newEmail: em }),
        });
        setEmailBanner(true);
      }

      dispatchStoreToast("Profile updated.", { duration: 3200 });
      onSaved();
      window.dispatchEvent(new Event("prisbocreations:profile-updated"));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      {emailBanner ? (
        <p className="rounded-xl border border-[var(--brand-amber)]/40 bg-[var(--brand-amber-light)] px-4 py-3 text-sm text-[var(--brand-ink)]">
          Check your new inbox — click the link to confirm the change.
        </p>
      ) : null}
      {emailTouched ? (
        <p className="text-sm text-[var(--brand-muted)]">A verification link will be sent to your new email.</p>
      ) : null}

      <label className="block text-sm font-medium text-[var(--brand-ink)]">
        Full name <span className="text-[var(--brand-error)]">*</span>
        <input
          required
          minLength={2}
          maxLength={80}
          className="mt-1.5 w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5 text-[var(--brand-ink)]"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </label>

      <label className="block text-sm font-medium text-[var(--brand-ink)]">
        Email address <span className="text-[var(--brand-error)]">*</span>
        <input
          required
          type="email"
          className="mt-1.5 w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5 text-[var(--brand-ink)]"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailErr(null);
          }}
        />
        {emailErr ? <p className="mt-1 text-sm text-[var(--brand-error)]">{emailErr}</p> : null}
      </label>

      <label className="block text-sm font-medium text-[var(--brand-ink)]">
        Phone number
        <input
          type="tel"
          inputMode="numeric"
          placeholder="9876543210"
          className="mt-1.5 w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5 text-[var(--brand-ink)]"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <span className="mt-1 block text-xs text-[var(--brand-muted)]">Optional — used for order SMS updates</span>
      </label>

      {err ? <p className="text-sm text-[var(--brand-error)]">{err}</p> : null}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary inline-flex min-h-11 items-center gap-2 px-8 disabled:opacity-60"
        >
          {saving ? <Spinner size="sm" className="text-white" /> : null}
          Save changes
        </button>
      </div>
    </form>
  );
}
