"use client";

import { useState } from "react";

export function HelpfulButtons({
  reviewId,
  helpfulCount,
  notHelpfulCount,
  initialVote,
}: {
  reviewId: string;
  helpfulCount: number;
  notHelpfulCount: number;
  initialVote: boolean | null;
}) {
  const [h, setH] = useState(helpfulCount);
  const [n, setN] = useState(notHelpfulCount);
  const [vote, setVote] = useState<boolean | null>(initialVote);
  const [busy, setBusy] = useState(false);

  async function send(isHelpful: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/reviews/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ reviewId, isHelpful }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        data?: { helpfulCount: number; notHelpfulCount: number; yourVote: boolean };
      };
      if (j.ok && j.data) {
        setH(j.data.helpfulCount);
        setN(j.data.notHelpfulCount);
        setVote(j.data.yourVote);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--brand-muted)]">
      <span>Was this helpful?</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void send(true)}
        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
          vote === true
            ? "border-[var(--am)] bg-[var(--aml)] text-[var(--amd)]"
            : "border-[var(--brand-border)] hover:border-[var(--am)]"
        }`}
      >
        👍 Helpful ({h})
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void send(false)}
        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
          vote === false
            ? "border-[var(--am)] bg-[var(--aml)] text-[var(--amd)]"
            : "border-[var(--brand-border)] hover:border-[var(--am)]"
        }`}
      >
        👎 Not helpful ({n})
      </button>
    </div>
  );
}
