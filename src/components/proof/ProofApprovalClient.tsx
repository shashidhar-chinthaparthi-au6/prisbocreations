"use client";

import Image from "next/image";
import { useState } from "react";

interface Props {
  token: string;
  proofImageUrl: string;
  productName: string;
}

export function ProofApprovalClient({ token, proofImageUrl, productName }: Props) {
  const [stage, setStage] = useState<"idle" | "rejecting" | "loading" | "approved" | "rejected">(
    "idle",
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "approve" | "reject") {
    setError(null);
    setStage("loading");
    try {
      const res = await fetch(`/api/v1/proof/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: action === "reject" ? note : undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      setStage(action === "approve" ? "approved" : "rejected");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage(action === "reject" ? "rejecting" : "idle");
    }
  }

  if (stage === "approved") {
    return (
      <div className="bg-white rounded-2xl border border-sand-deep p-8 text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h2 className="font-display text-xl text-ink">Production started!</h2>
        <p className="text-ink-muted text-sm">
          Your design is approved and we&apos;re getting to work. You&apos;ll receive a shipping
          notification once your order is dispatched.
        </p>
      </div>
    );
  }

  if (stage === "rejected") {
    return (
      <div className="bg-white rounded-2xl border border-sand-deep p-8 text-center space-y-4">
        <div className="text-5xl">✏️</div>
        <h2 className="font-display text-xl text-ink">Feedback received</h2>
        <p className="text-ink-muted text-sm">
          We&apos;ve noted your changes. Our team will send you a revised proof shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-sand-deep overflow-hidden">
        <div className="p-4 border-b border-sand-deep">
          <p className="text-sm font-medium text-ink">{productName}</p>
          <p className="text-xs text-ink-muted mt-0.5">
            Review the proof carefully — this is exactly how your product will be printed.
          </p>
        </div>
        {proofImageUrl ? (
          <div className="relative w-full aspect-square bg-sand">
            <Image
              src={proofImageUrl}
              alt={`Design proof for ${productName}`}
              fill
              className="object-contain p-4"
              sizes="(max-width: 672px) 100vw, 672px"
            />
          </div>
        ) : (
          <div className="h-64 bg-sand flex items-center justify-center text-ink-muted text-sm">
            Proof image unavailable
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}

      {stage === "rejecting" ? (
        <div className="bg-white rounded-2xl border border-sand-deep p-6 space-y-4">
          <h3 className="font-medium text-ink">What would you like changed?</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Please describe what you'd like us to change…"
            className="w-full border border-sand-deep rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
          <div className="flex gap-3">
            <button
              onClick={() => submit("reject")}
              disabled={!note.trim()}
              className="flex-1 bg-ink hover:bg-ink/90 disabled:opacity-50 text-white text-sm font-medium rounded-full py-2.5 transition-colors"
            >
              Send feedback
            </button>
            <button
              onClick={() => setStage("idle")}
              className="px-4 text-sm text-ink-muted hover:text-ink"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => submit("approve")}
            disabled={stage === "loading"}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-full py-3 transition-colors"
          >
            {stage === "loading" ? "Processing…" : "✓ Approve & start production"}
          </button>
          <button
            onClick={() => setStage("rejecting")}
            disabled={stage === "loading"}
            className="flex-1 border border-sand-deep hover:border-ink text-ink text-sm font-medium rounded-full py-3 transition-colors"
          >
            Request changes
          </button>
        </div>
      )}

      <p className="text-xs text-ink-muted text-center">
        By approving, you confirm the design is correct. Approved proofs cannot be refunded for
        design reasons.
      </p>
    </div>
  );
}
