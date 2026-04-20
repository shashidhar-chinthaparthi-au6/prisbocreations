"use client";

export function DeleteAddressModal({
  open,
  label,
  onClose,
  onConfirm,
  busy,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" role="dialog">
      <div className="max-w-md rounded-2xl bg-[var(--brand-card)] p-6 shadow-[var(--shadow-modal)]">
        <h2 className="font-display text-lg text-[var(--brand-ink)]">Delete address?</h2>
        <p className="mt-2 text-sm text-[var(--brand-muted)]">
          Remove <span className="font-medium text-[var(--brand-ink)]">{label}</span> from saved addresses?
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-full border border-[var(--brand-border)] px-4 py-2 text-sm font-medium"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full bg-[var(--brand-error)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={busy}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
