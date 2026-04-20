"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Spinner } from "@/components/ui/Spinner";
import { dispatchStoreToast } from "@/components/store/StoreToaster";

export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [currentErr, setCurrentErr] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCurrentErr(null);
    setFormErr(null);
    if (newPassword.length < 8) {
      setFormErr("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setFormErr("New passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setFormErr("New password must be different from your current password.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/account/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      dispatchStoreToast("Password updated successfully.", { duration: 4000 });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : "Could not update";
      if (msg.toLowerCase().includes("incorrect password")) {
        setCurrentErr("Incorrect password. Try again.");
      } else {
        setFormErr(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <label className="block text-sm font-medium text-[var(--brand-ink)]">
        Current password <span className="text-[var(--brand-error)]">*</span>
        <div className="relative mt-1.5">
          <input
            required
            type={show[0] ? "text" : "password"}
            autoComplete="current-password"
            className="w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5 pr-16"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--brand-amber)]"
            onClick={() => setShow((s) => [!s[0], s[1], s[2]])}
          >
            {show[0] ? "Hide" : "Show"}
          </button>
        </div>
        {currentErr ? <p className="mt-1 text-sm text-[var(--brand-error)]">{currentErr}</p> : null}
      </label>

      <div>
        <label className="block text-sm font-medium text-[var(--brand-ink)]">
          New password <span className="text-[var(--brand-error)]">*</span>
          <div className="relative mt-1.5">
            <input
              required
              type={show[1] ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              className="w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5 pr-16"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--brand-amber)]"
              onClick={() => setShow((s) => [s[0], !s[1], s[2]])}
            >
              {show[1] ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <div className="mt-2">
          <PasswordStrength password={newPassword} />
        </div>
      </div>

      <label className="block text-sm font-medium text-[var(--brand-ink)]">
        Confirm new password <span className="text-[var(--brand-error)]">*</span>
        <div className="relative mt-1.5">
          <input
            required
            type={show[2] ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            className="w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5 pr-16"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--brand-amber)]"
            onClick={() => setShow((s) => [s[0], s[1], !s[2]])}
          >
            {show[2] ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      {formErr ? <p className="text-sm text-[var(--brand-error)]">{formErr}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="btn-primary inline-flex min-h-11 items-center gap-2 px-8 disabled:opacity-60"
      >
        {saving ? <Spinner size="sm" className="text-white" /> : null}
        Update password
      </button>
    </form>
  );
}
