"use client";

import { useState } from "react";

export function DeleteConfirmInput({
  onValidityChange,
}: {
  onValidityChange: (ok: boolean) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <label className="block text-sm font-medium text-[var(--brand-ink)]">
      Type DELETE to confirm
      <input
        className="mt-1.5 w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5 font-mono uppercase tracking-wide"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          onValidityChange(v === "DELETE");
        }}
        autoComplete="off"
      />
    </label>
  );
}
