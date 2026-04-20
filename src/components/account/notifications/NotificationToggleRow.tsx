"use client";

import { useState } from "react";

export function NotificationToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      await onChange(!checked);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--brand-border)] py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[var(--brand-ink)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {saved ? <span className="text-xs font-medium text-[var(--brand-success)]">Saved ✓</span> : null}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
            checked ? "bg-[var(--brand-amber)]" : "bg-[var(--brand-border)]"
          } disabled:opacity-60`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              checked ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
