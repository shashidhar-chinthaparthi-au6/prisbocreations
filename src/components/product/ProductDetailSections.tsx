"use client";

import { useId } from "react";
import { isHtmlContentEmpty } from "@/lib/html-content-empty";

const SECTION_PROSE =
  "prose prose-slate mt-8 max-w-none leading-relaxed text-ink-muted prose-headings:font-display prose-headings:text-ink prose-p:text-ink-muted prose-strong:text-ink prose-li:marker:text-ink-muted prose-blockquote:border-sand-deep prose-blockquote:text-ink-muted prose-a:text-accent";

export function ProductDetailSections({
  displayDescriptionHtml,
  displayFeatureLines,
  legacyFeaturesHtml,
  displaySpecificationRows,
  legacySpecificationsHtml,
  displayHighlightLines,
  legacyHighlightsHtml,
  packageDimensionsRows,
  tags,
  className = "",
}: {
  displayDescriptionHtml: string;
  displayFeatureLines: string[];
  legacyFeaturesHtml: string;
  displaySpecificationRows: { key: string; value: string }[];
  legacySpecificationsHtml: string;
  displayHighlightLines: string[];
  legacyHighlightsHtml: string;
  /** Appended below schema-driven spec rows (packed weight & box size). */
  packageDimensionsRows?: { key: string; value: string }[];
  tags: string[];
  className?: string;
}) {
  const uid = useId();
  const idFeatures = `${uid}-features`;
  const idSpecs = `${uid}-specs`;
  const idHighlights = `${uid}-highlights`;

  return (
    <div className={className}>
      <div
        suppressHydrationWarning
        className="product-description prose prose-slate max-w-none leading-relaxed text-ink-muted prose-headings:font-display prose-headings:text-ink prose-p:text-ink-muted prose-strong:text-ink prose-li:marker:text-ink-muted prose-blockquote:border-sand-deep prose-blockquote:text-ink-muted prose-a:text-accent"
        dangerouslySetInnerHTML={{ __html: displayDescriptionHtml }}
      />
      {displayFeatureLines.length > 0 ? (
        <section className="border-t border-sand-deep/80 pt-8" aria-labelledby={idFeatures}>
          <h2 id={idFeatures} className="font-display text-xl text-ink">
            Features
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-muted marker:text-ink-muted">
            {displayFeatureLines.map((line, i) => (
              <li key={`f-${i}`}>{line}</li>
            ))}
          </ul>
        </section>
      ) : !isHtmlContentEmpty(legacyFeaturesHtml) ? (
        <section className="border-t border-sand-deep/80 pt-8" aria-labelledby={idFeatures}>
          <h2 id={idFeatures} className="font-display text-xl text-ink">
            Features
          </h2>
          <div
            suppressHydrationWarning
            className={SECTION_PROSE}
            dangerouslySetInnerHTML={{ __html: legacyFeaturesHtml }}
          />
        </section>
      ) : null}
      {displaySpecificationRows.length > 0 ? (
        <section className="border-t border-sand-deep/80 pt-8" aria-labelledby={idSpecs}>
          <h2 id={idSpecs} className="font-display text-xl text-ink">
            Specifications
          </h2>
          <dl className="mt-3 divide-y divide-sand-deep/80 rounded-lg border border-sand-deep/80 bg-white/60 text-sm">
            {displaySpecificationRows.map((row, i) => (
              <div
                key={`spec-${i}-${row.key}`}
                className="grid gap-0.5 px-3 py-2.5 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-4"
              >
                <dt className="font-medium text-ink">{row.key}</dt>
                <dd className="text-ink-muted">{row.value}</dd>
              </div>
            ))}
            {packageDimensionsRows && packageDimensionsRows.length > 0 ? (
              <>
                <div className="border-t border-sand-deep/80 bg-sand/35 px-3 py-2">
                  <p className="text-sm font-semibold text-ink">Product dimensions &amp; weight</p>
                </div>
                {packageDimensionsRows.map((row, i) => (
                  <div
                    key={`pkg-spec-${i}-${row.key}`}
                    className="grid gap-0.5 px-3 py-2.5 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-4"
                  >
                    <dt className="font-medium text-ink">{row.key}</dt>
                    <dd className="text-ink-muted">{row.value}</dd>
                  </div>
                ))}
              </>
            ) : null}
          </dl>
        </section>
      ) : !isHtmlContentEmpty(legacySpecificationsHtml) ? (
        <section className="border-t border-sand-deep/80 pt-8" aria-labelledby={idSpecs}>
          <h2 id={idSpecs} className="font-display text-xl text-ink">
            Specifications
          </h2>
          <div
            suppressHydrationWarning
            className={SECTION_PROSE}
            dangerouslySetInnerHTML={{ __html: legacySpecificationsHtml }}
          />
          {packageDimensionsRows && packageDimensionsRows.length > 0 ? (
            <dl className="mt-6 divide-y divide-sand-deep/80 rounded-lg border border-sand-deep/80 bg-white/60 text-sm">
              <div className="border-t border-sand-deep/80 bg-sand/35 px-3 py-2">
                <p className="text-sm font-semibold text-ink">Product dimensions &amp; weight</p>
              </div>
              {packageDimensionsRows.map((row, i) => (
                <div
                  key={`pkg-legacy-${i}-${row.key}`}
                  className="grid gap-0.5 px-3 py-2.5 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-4"
                >
                  <dt className="font-medium text-ink">{row.key}</dt>
                  <dd className="text-ink-muted">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ) : packageDimensionsRows && packageDimensionsRows.length > 0 ? (
        <section className="border-t border-sand-deep/80 pt-8" aria-labelledby={idSpecs}>
          <h2 id={idSpecs} className="font-display text-xl text-ink">
            Specifications
          </h2>
          <dl className="mt-3 divide-y divide-sand-deep/80 rounded-lg border border-sand-deep/80 bg-white/60 text-sm">
            <div className="bg-sand/35 px-3 py-2">
              <p className="text-sm font-semibold text-ink">Product dimensions &amp; weight</p>
            </div>
            {packageDimensionsRows.map((row, i) => (
              <div
                key={`pkg-only-${i}-${row.key}`}
                className="grid gap-0.5 px-3 py-2.5 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-4"
              >
                <dt className="font-medium text-ink">{row.key}</dt>
                <dd className="text-ink-muted">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {displayHighlightLines.length > 0 ? (
        <section className="border-t border-sand-deep/80 pt-8" aria-labelledby={idHighlights}>
          <h2 id={idHighlights} className="font-display text-xl text-ink">
            Highlights
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-muted marker:text-ink-muted">
            {displayHighlightLines.map((line, i) => (
              <li key={`h-${i}`}>{line}</li>
            ))}
          </ul>
        </section>
      ) : !isHtmlContentEmpty(legacyHighlightsHtml) ? (
        <section className="border-t border-sand-deep/80 pt-8" aria-labelledby={idHighlights}>
          <h2 id={idHighlights} className="font-display text-xl text-ink">
            Highlights
          </h2>
          <div
            suppressHydrationWarning
            className={SECTION_PROSE}
            dangerouslySetInnerHTML={{ __html: legacyHighlightsHtml }}
          />
        </section>
      ) : null}
      {tags.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-sand-deep px-3 py-1 text-xs text-ink-muted">
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
