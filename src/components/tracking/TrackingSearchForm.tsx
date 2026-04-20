"use client";

export function TrackingSearchForm({
  orderNumber,
  email,
  onOrderChange,
  onEmailChange,
  onSubmit,
  busy,
}: {
  orderNumber: string;
  email: string;
  onOrderChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A]">
          Order number <span className="text-red-600">*</span>
        </label>
        <input
          className="mt-1.5 w-full rounded-lg border border-[#D3D1C7] bg-white px-3 py-2.5 font-mono text-sm text-[#1A1A1A] outline-none ring-[#C47A2B] focus:ring-2"
          value={orderNumber}
          onChange={(e) => onOrderChange(e.target.value)}
          placeholder="PB-2026-00142"
          autoComplete="off"
          required
        />
        <p className="mt-1 text-xs text-[#6B6560]">Hint: Found in your confirmation email</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A]">
          Email address <span className="text-red-600">*</span>
        </label>
        <input
          type="email"
          className="mt-1.5 w-full rounded-lg border border-[#D3D1C7] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none ring-[#C47A2B] focus:ring-2"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <p className="mt-1 text-xs text-[#6B6560]">Use the email you placed the order with</p>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center rounded-full bg-[#C47A2B] py-3 text-sm font-semibold text-white transition hover:bg-[#A86424] disabled:opacity-60"
      >
        {busy ? "Loading…" : "Track order →"}
      </button>
    </form>
  );
}
