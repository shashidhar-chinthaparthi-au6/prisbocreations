"use client";

import { useEffect, useState } from "react";
import type { MeUserDto } from "@/lib/user-me-dto";
import { Spinner } from "@/components/ui/Spinner";

export type AddressFormValue = MeUserDto["addresses"][number];

const empty: AddressFormValue = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

type Props = {
  open: boolean;
  title: string;
  initial?: AddressFormValue | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (v: AddressFormValue) => void;
};

export function AddressFormModal({
  open,
  title,
  initial,
  saving,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [v, setV] = useState<AddressFormValue>(empty);

  useEffect(() => {
    if (!open) return;
    setV(initial ? { ...empty, ...initial } : { ...empty });
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="addr-modal-title"
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-sand-deep bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="addr-modal-title" className="font-display text-xl text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-ink-muted hover:bg-sand hover:text-ink"
          >
            Close
          </button>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(v);
          }}
        >
          {(
            [
              ["fullName", "Full name"],
              ["phone", "Phone"],
              ["line1", "Address line 1"],
              ["line2", "Address line 2 (optional)"],
              ["city", "City"],
              ["state", "State"],
              ["postalCode", "Postal code"],
              ["country", "Country"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="block text-sm">
              <span className="text-ink-muted">{label}</span>
              <input
                required={k !== "line2"}
                className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
                value={v[k]}
                onChange={(e) => setV((s) => ({ ...s, [k]: e.target.value }))}
              />
            </label>
          ))}
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-sand-deep px-4 py-2 text-sm font-medium text-ink hover:bg-sand"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Saving…
                </>
              ) : (
                "Save address"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
