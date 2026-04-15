import { freeShippingMinRupeesWhole } from "@/lib/free-shipping";

function IconTruck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M14 18V6h8v9h-3M2 18h20M6 18v-4M2 10h12v8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
    </svg>
  );
}

function IconHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.8a5.5 5.5 0 0 0 0-7.8z" strokeLinejoin="round" />
    </svg>
  );
}

export function HomeTrustBar() {
  const minInr = freeShippingMinRupeesWhole();
  const items = [
    {
      icon: IconTruck,
      title: `Free shipping over ₹${minInr.toLocaleString("en-IN")}`,
      body: "Pan-India on qualifying cart totals.",
    },
    {
      icon: IconShield,
      title: "Secure payments",
      body: "UPI, cards, and COD where available.",
    },
    {
      icon: IconHeart,
      title: "Personalised in India",
      body: "Made and packed with care in our studio.",
    },
  ];
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] sm:grid-cols-3 sm:gap-4 sm:p-5">
      {items.map(({ icon: Icon, title, body }) => (
        <div
          key={title}
          className="flex gap-3 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-3 sm:flex-col sm:items-center sm:text-center"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-accent shadow-sm ring-1 ring-slate-200/80">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
