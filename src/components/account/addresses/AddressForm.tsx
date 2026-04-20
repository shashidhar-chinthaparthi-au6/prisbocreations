"use client";

import { useCallback, useEffect, useState } from "react";
import { INDIAN_STATES } from "@/lib/indian-states";
import { PincodeField } from "./PincodeField";
import { Spinner } from "@/components/ui/Spinner";

export type AddressFormValues = {
  label: "Home" | "Office" | "Other";
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export const emptyAddressForm: AddressFormValues = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

export function AddressForm({
  formKey,
  title,
  initial,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  formKey: string;
  title: string;
  initial: AddressFormValues | null;
  saving: boolean;
  error: string | null;
  onSubmit: (v: AddressFormValues) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<AddressFormValues>(() =>
    initial ? { ...emptyAddressForm, ...initial } : { ...emptyAddressForm },
  );
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    setV(initial ? { ...emptyAddressForm, ...initial } : { ...emptyAddressForm });
  }, [formKey, initial]);

  const onResolved = useCallback((city: string, state: string) => {
    setV((prev) => ({ ...prev, city, state }));
  }, []);

  function setField<K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr(null);
    const phone = v.phone.replace(/\D/g, "");
    const pin = v.pincode.replace(/\D/g, "").slice(0, 6);
    if (phone.length !== 10 || !/^[6-9]/.test(phone)) {
      setLocalErr("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (pin.length !== 6) {
      setLocalErr("Enter a 6-digit PIN code.");
      return;
    }
    onSubmit({
      ...v,
      phone,
      pincode: pin,
      fullName: v.fullName.trim(),
      line1: v.line1.trim(),
      line2: v.line2.trim(),
      city: v.city.trim(),
      state: v.state.trim(),
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-5 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-lg text-[var(--brand-ink)]">{title}</h2>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <label className="block text-sm font-medium text-[var(--brand-ink)]">
          Label
          <select
            className="mt-1.5 w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5"
            value={v.label}
            onChange={(e) => setField("label", e.target.value as AddressFormValues["label"])}
          >
            <option value="Home">Home</option>
            <option value="Office">Office</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[var(--brand-ink)]">
            Full name <span className="text-[var(--brand-error)]">*</span>
            <input
              required
              minLength={2}
              className="mt-1.5 w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5"
              value={v.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--brand-ink)]">
            Phone <span className="text-[var(--brand-error)]">*</span>
            <input
              required
              inputMode="numeric"
              minLength={10}
              maxLength={15}
              className="mt-1.5 w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5"
              value={v.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-[var(--brand-ink)]">
          Address line 1 <span className="text-[var(--brand-error)]">*</span>
          <input
            required
            minLength={5}
            className="mt-1.5 w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5"
            placeholder="House/flat number, building, street"
            value={v.line1}
            onChange={(e) => setField("line1", e.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-[var(--brand-ink)]">
          Address line 2 (optional)
          <input
            className="mt-1.5 w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5"
            placeholder="Area, landmark"
            value={v.line2}
            onChange={(e) => setField("line2", e.target.value)}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-[var(--brand-ink)]">
            PIN code <span className="text-[var(--brand-error)]">*</span>
            <PincodeField
              value={v.pincode}
              onChange={(pin) => setField("pincode", pin)}
              onResolved={onResolved}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--brand-ink)]">
            City <span className="text-[var(--brand-error)]">*</span>
            <input
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5"
              value={v.city}
              onChange={(e) => setField("city", e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--brand-ink)]">
            State <span className="text-[var(--brand-error)]">*</span>
            <select
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5"
              value={v.state}
              onChange={(e) => setField("state", e.target.value)}
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--brand-ink)]">
          <input
            type="checkbox"
            checked={v.isDefault}
            onChange={(e) => setField("isDefault", e.target.checked)}
            className="h-4 w-4 rounded border-[var(--brand-border)]"
          />
          Set as default delivery address
        </label>

        {localErr ? <p className="text-sm text-[var(--brand-error)]">{localErr}</p> : null}
        {error ? <p className="text-sm text-[var(--brand-error)]">{error}</p> : null}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex min-h-11 items-center gap-2 px-6 disabled:opacity-60"
          >
            {saving ? <Spinner size="sm" className="text-white" /> : null}
            Save address
          </button>
          <button type="button" className="btn-secondary min-h-11" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
