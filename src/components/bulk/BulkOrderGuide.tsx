import {
  COURIER_LEAD,
  PROOF_LEAD,
  deliveryTable,
  packagingRows,
  personalisationRows,
} from "@/lib/bulk/offer";
import { BULK_ENQUIRY_MIN, BULK_PRICE_MOQ } from "@/lib/bulk/pricing";

function OfferList({ rows }: { rows: { title: string; detail: string; price: string }[] }) {
  return (
    <ul className="mt-4 space-y-4">
      {rows.map((row) => (
        <li key={row.title}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-medium text-[var(--brand-ink)]">{row.title}</p>
            <p className="shrink-0 text-sm font-semibold text-[var(--brand-amber-dark)]">{row.price}</p>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[var(--brand-muted)]">{row.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export function BulkOrderGuide() {
  const delivery = deliveryTable();
  return (
    <>
      <section id="options" className="store-section mt-16">
        <h2 className="section-title">Personalisation, logos, and packaging</h2>
        <p className="section-subtitle max-w-[62ch]">
          Tier prices assume the same artwork on every piece. Logo printing is included from{" "}
          {BULK_PRICE_MOQ}. Packaging can stay in a shared carton or be finished piece by piece.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-[var(--brand-border)] bg-white p-5">
            <h3 className="font-display text-2xl text-[var(--brand-ink)]">Personalisation</h3>
            <OfferList
              rows={personalisationRows().filter(
                (row) => row.title.startsWith("Same line") || row.title.startsWith("A different name"),
              )}
            />
          </article>
          <article className="rounded-2xl border border-[var(--brand-border)] bg-white p-5">
            <h3 className="font-display text-2xl text-[var(--brand-ink)]">Logo printing</h3>
            <OfferList
              rows={personalisationRows().filter(
                (row) => row.title.startsWith("Logo") || row.title.startsWith("Photo"),
              )}
            />
          </article>
          <article className="rounded-2xl border border-[var(--brand-border)] bg-white p-5">
            <h3 className="font-display text-2xl text-[var(--brand-ink)]">Packaging</h3>
            <OfferList rows={packagingRows()} />
          </article>
        </div>
      </section>

      <section id="delivery" className="store-section mt-16">
        <h2 className="section-title">Minimums and delivery</h2>
        <p className="section-subtitle max-w-[68ch]">
          Listed prices start at {BULK_PRICE_MOQ} pieces. From {BULK_ENQUIRY_MIN} pieces we still quote,
          using the shop price as the starting point. A proof goes out within {PROOF_LEAD}. Studio time
          below starts once you approve it, and courier across India is then {COURIER_LEAD}.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--brand-border)] bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Estimated production and courier times by quantity</caption>
            <thead>
              <tr className="border-b border-[var(--brand-border)] text-[11px] uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                <th className="px-4 py-3 font-semibold">Quantity</th>
                <th className="px-4 py-3 font-semibold">Print and everyday pieces</th>
                <th className="px-4 py-3 font-semibold">Frames, lamps, and hampers</th>
                <th className="px-4 py-3 font-semibold">Courier after dispatch</th>
              </tr>
            </thead>
            <tbody>
              {delivery.map((row) => (
                <tr key={row.quantity} className="border-b border-[var(--brand-border)] last:border-0">
                  <th className="px-4 py-3 font-semibold text-[var(--brand-ink)]">{row.quantity}</th>
                  <td className="px-4 py-3 text-[var(--brand-ink)]">{row.everyday}</td>
                  <td className="px-4 py-3 text-[var(--brand-ink)]">{row.made}</td>
                  <td className="px-4 py-3 text-[var(--brand-ink)]">{row.courier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
