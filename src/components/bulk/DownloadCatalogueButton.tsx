"use client";

import { useState } from "react";

export function DownloadCatalogueButton({
  label = "Download catalogue",
}: {
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/v1/bulk-catalogue");
      if (!res.ok) throw new Error("catalogue");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "prisbo-bulk-catalogue.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-full bg-[var(--brand-amber-dark)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#73400f] disabled:opacity-60"
      >
        {busy ? "Preparing catalogue…" : label}
      </button>
      {failed ? (
        <span className="text-xs text-[var(--brand-error)]">
          The catalogue could not be prepared. Try again in a moment.
        </span>
      ) : null}
    </span>
  );
}
