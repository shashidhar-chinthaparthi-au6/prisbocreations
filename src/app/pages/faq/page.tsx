"use client";

import { useState } from "react";
import Link from "next/link";

const FAQ = [
  {
    q: "How long does personalisation take?",
    a: "Most personalised orders leave our studio within 2–4 business days. Once your order is confirmed, we’ll prepare a digital proof within 24 hours for you to approve before we start printing.",
  },
  {
    q: "What is a design proof and why do I need to approve it?",
    a: "A proof is a digital preview of exactly how your product will be printed — your text, names, photos, and layout. We email and WhatsApp you the proof link before production starts. Once you approve, we begin manufacturing immediately. This step ensures there are no spelling errors or layout surprises.",
  },
  {
    q: "Can I make changes after I’ve placed my order?",
    a: "Yes — if you request changes during the proof review, we’ll revise and send you a new proof. However, once you have approved the proof, production starts and changes are no longer possible.",
  },
  {
    q: "Do you ship across India?",
    a: "Yes — we ship pan-India via courier. Delivery typically takes 3–7 business days after dispatch, depending on your location. You’ll receive a tracking number once your order is shipped.",
  },
  {
    q: "Is free shipping available?",
    a: "Yes, free shipping is offered on orders above a qualifying cart total, shown in the announcement bar at the top of the page.",
  },
  {
    q: "Can I pay with Cash on Delivery (COD)?",
    a: "Yes, COD is available for most pincodes in India. Serviceability is shown at checkout once you enter your delivery address.",
  },
  {
    q: "What file formats do you accept for custom images?",
    a: "We accept JPG, PNG, and WebP images up to 10 MB each. For best print quality, please upload high-resolution images (minimum 150 DPI at the final print size). Our team will let you know if an image is too low resolution during the proof stage.",
  },
  {
    q: "Can I order in bulk for corporate gifting or events?",
    a: "Absolutely! We specialise in bulk personalised orders for weddings, corporate gifting, school events, and more. Minimum quantities and pricing vary by product. Fill in our Bulk & Corporate Inquiry form and we’ll get back to you within 24 hours.",
  },
  {
    q: "What is your return and refund policy?",
    a: "Because each item is personalised and made to order, we cannot accept returns for design reasons once you have approved the proof. However, if your order arrives damaged or the print differs from the approved proof, we will replace it at no cost — just send us a photo within 48 hours of delivery.",
  },
  {
    q: "How do I track my order?",
    a: "Once your order is dispatched, you’ll receive a tracking number via email and SMS. You can also visit our Track Order page at any time and enter your order number or registered email.",
  },
  {
    q: "Can I cancel my order?",
    a: "Cancellations are accepted within 12 hours of placing the order, before a proof has been sent. After proof preparation begins, we cannot cancel as materials and studio time are already committed. Contact us on WhatsApp as soon as possible if you need to cancel.",
  },
  {
    q: "Do you offer gift wrapping?",
    a: "Yes! You can add premium gift wrapping at checkout. We also include a printed gift message card if you add one during checkout.",
  },
  {
    q: "Are your products eco-friendly?",
    a: "We use FSC-certified paper for all stationery and paper products, and water-based, non-toxic inks for our prints. We are continuously working to reduce packaging waste.",
  },
  {
    q: "How do I contact you if I have a problem?",
    a: "The fastest way to reach us is WhatsApp — the chat button is at the bottom-right of every page. You can also email us or call during business hours (Mon–Sat, 10 am – 7 pm). We respond to all queries within 4 business hours.",
  },
  {
    q: "Do you have a physical store?",
    a: "We are a studio-based brand operating out of Hyderabad, India. We do not have a walk-in retail store, but you are welcome to contact us to arrange a studio visit for large or corporate orders.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav className="text-sm text-[var(--brand-muted)]">
        <Link href="/">Home</Link> / FAQ
      </nav>
      <h1 className="font-display text-3xl text-[var(--brand-ink)]">Frequently asked questions</h1>
      <div className="space-y-2">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-card)]">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left font-medium text-[var(--brand-ink)]"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                {item.q}
                <span className="text-[var(--brand-muted)]" aria-hidden>
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen ? (
                <div className="border-t border-[var(--brand-border)] px-4 py-3 text-sm text-[var(--brand-muted)]">
                  {item.a}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
