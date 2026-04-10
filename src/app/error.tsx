"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-rose/30 bg-white p-8 text-center shadow-sm">
      <h2 className="font-display text-xl text-ink">Something went wrong</h2>
      <p className="text-sm text-ink-muted">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-ink px-4 py-2 text-sm text-white hover:bg-ink/90"
      >
        Try again
      </button>
    </div>
  );
}
