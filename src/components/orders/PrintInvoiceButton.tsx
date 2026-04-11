"use client";

export function PrintInvoiceButton() {
  return (
    <button
      type="button"
      className="rounded-full border border-sand-deep bg-white px-4 py-2 text-sm font-medium text-ink hover:border-accent"
      onClick={() => window.print()}
    >
      Print / Save PDF
    </button>
  );
}
