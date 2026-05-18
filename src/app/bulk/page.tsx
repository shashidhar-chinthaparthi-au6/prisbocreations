import type { Metadata } from "next";
import { BulkInquiryForm } from "@/components/bulk/BulkInquiryForm";

export const metadata: Metadata = {
  title: "Bulk & Corporate Orders | Prisbo Creations",
  description:
    "Custom branded gifts for teams, events, and corporate gifting. Minimum 25 units. Get a personalised quote.",
};

export default function BulkPage() {
  return (
    <main className="min-h-screen bg-sand py-12 md:py-20">
      <div className="max-w-2xl mx-auto px-4">
        <p className="text-accent text-sm font-medium uppercase tracking-widest mb-2">
          Corporate &amp; Bulk
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-ink mb-4">
          Ordering in bulk?
        </h1>
        <p className="text-ink-muted mb-8 leading-relaxed">
          We specialise in personalised branded gifts for teams, client events,
          weddings, and corporate milestones. Minimum 25 units. Custom pricing
          based on product, quantity, and turnaround. Fill in the form and we'll
          be in touch within 24 hours.
        </p>
        <BulkInquiryForm />
      </div>
    </main>
  );
}
