import type { Metadata } from "next";
import { BulkCatalogueBrowser } from "@/components/bulk/BulkCatalogueBrowser";
import { BulkInquiryForm } from "@/components/bulk/BulkInquiryForm";
import { BulkOrderGuide } from "@/components/bulk/BulkOrderGuide";
import { DownloadCatalogueButton } from "@/components/bulk/DownloadCatalogueButton";
import { WhatsAppMark } from "@/components/bulk/WhatsAppMark";
import { loadBulkCatalogue } from "@/lib/bulk/catalogue";
import { bulkWhatsAppHref, resolveBulkWhatsAppPhone } from "@/lib/bulk/whatsapp";
import { BULK_PRICE_MOQ } from "@/lib/bulk/pricing";
import { STOREFRONT_FULL_BLEED } from "@/lib/storefront-layout";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Bulk orders",
  description:
    "Download the Prisbo bulk catalogue with product photographs. Prices at 50, 100, 250 and 500 pieces, plus personalisation, logo printing, packaging, minimums, and delivery times.",
};

export default async function BulkPage() {
  const items = await loadBulkCatalogue();
  const photoCount = items.filter((item) => item.imageUrl).length;
  const whatsappPhone = resolveBulkWhatsAppPhone();
  const waHref = bulkWhatsAppHref(whatsappPhone);

  return (
    <div className={`${STOREFRONT_FULL_BLEED} pb-20`}>
      <section className="store-section pt-6 md:pt-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-amber)]">
          Corporate and bulk
        </p>
        <h1 className="mt-3 max-w-[14ch] font-display text-[40px] font-medium leading-[0.95] tracking-[-0.03em] text-[var(--brand-ink)] md:text-[64px]">
          Pieces for the whole group.
        </h1>
        <p className="mt-4 max-w-[48ch] text-[16px] leading-relaxed text-[var(--brand-muted)]">
          Personalised gifts for teams, churches, schools, and events. Download the catalogue, compare
          unit prices at 50, 100, 250, and 500 pieces, then send the details or message us on WhatsApp.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <DownloadCatalogueButton />
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#128C7E] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d7368]"
            >
              <WhatsAppMark />
              Enquire on WhatsApp
            </a>
          ) : null}
          <a
            href="#enquire"
            className="inline-flex items-center justify-center rounded-full border border-[var(--brand-border-dark)] bg-white px-6 py-3 text-sm font-semibold text-[var(--brand-ink)] transition-colors hover:border-[var(--brand-amber)]"
          >
            Send an enquiry
          </a>
        </div>
      </section>

      <section className="store-section mt-10">
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            ["From 50 pieces", "Listed volume prices begin here. Smaller runs can still be quoted."],
            ["Proof in a day", "You approve the artwork before the studio starts the run."],
            ["Reply in 24 hours", "We answer enquiries on business days, Monday to Saturday."],
          ].map(([title, detail]) => (
            <li key={title} className="rounded-2xl border border-[var(--brand-border)] bg-white px-5 py-4">
              <p className="font-medium text-[var(--brand-ink)]">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--brand-muted)]">{detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="catalogue" className="store-section mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Catalogue and prices</h2>
            <p className="section-subtitle max-w-[68ch]">
              Each price is per piece, for the same artwork across the run. Printed pieces step down
              further than frames, lamps, and hampers, where the materials take most of the shop price.
              A column that says Quote is one we price for that run.
              {photoCount > 0
                ? ` ${photoCount} pieces below include a photograph from the shop, and the download includes them too.`
                : " The download includes a photograph wherever the shop has one."}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <BulkCatalogueBrowser items={items} />
        </div>
        <p className="mt-4 text-sm text-[var(--brand-muted)]">
          Prices follow the current shop price and apply while that price holds. Delivery is quoted with
          the order. Minimum for a listed price: {BULK_PRICE_MOQ}.
        </p>
      </section>

      <BulkOrderGuide />

      <section id="enquire" className="store-section mt-16">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
          <div>
            <h2 className="section-title">Ask for a quote</h2>
            <p className="section-subtitle">
              Tell us the quantity, budget, customisation, and the date you need the order in hand.
              We reply within 24 hours on business days.
            </p>
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0d7368] hover:underline"
              >
                <WhatsAppMark />
                Prefer to talk now? Open WhatsApp
              </a>
            ) : null}
          </div>
          <BulkInquiryForm whatsappPhone={whatsappPhone} />
        </div>
      </section>
    </div>
  );
}
