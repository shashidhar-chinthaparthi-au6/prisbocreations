"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { HomeHeroSlide } from "@/lib/home-hero";

type Props = {
  slides: HomeHeroSlide[];
};

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

const AUTOPLAY_MS = 7000;

export function HomeHeroCarousel({ slides }: Props) {
  const multi = slides.length > 1;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: multi,
    align: "start",
  });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    setIndex(emblaApi.selectedScrollSnap());
    const onSelect = () => setIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || !multi || paused) return;
    const t = setInterval(() => {
      emblaApi.scrollNext();
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [emblaApi, multi, paused]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!slides.length) return null;

  return (
    <section
      className="relative isolate"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative mx-auto grid w-full max-w-[1280px] items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-2 lg:gap-14 lg:px-12 lg:py-14">
        <div
          className="relative"
          role="region"
          aria-label="Featured highlights"
          aria-roledescription="carousel"
        >
          <div className="overflow-hidden rounded-[4px]" ref={emblaRef}>
            <div className="flex">
              {slides.map((s, i) => (
                <div
                  key={`${s.image}-${i}`}
                  className="min-h-0 min-w-0 shrink-0 grow-0 basis-full"
                >
                  <div className="relative aspect-[5/4] overflow-hidden bg-[#efeae3] lg:aspect-[6/5]">
                    <Image
                      src={s.image}
                      alt=""
                      fill
                      priority={i === 0}
                      className="object-cover"
                      sizes="(min-width: 1024px) 46vw, 100vw"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <span className="pointer-events-none absolute bottom-3 left-3 text-[10px] tracking-[0.14em] text-white/80">
            01 / personalised
          </span>
          <span className="pointer-events-none absolute bottom-3 right-4 text-[10px] tracking-[0.14em] text-white/80">
            studio
          </span>

          {multi ? (
            <>
              <div
                className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-1.5"
                role="tablist"
                aria-label="Slide"
              >
                {slides.map((_, i) => (
                  <button
                    key={`dot-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Slide ${i + 1} of ${slides.length}`}
                    onClick={() => emblaApi?.scrollTo(i)}
                    className={`pointer-events-auto h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                      i === index ? "w-5 bg-white" : "bg-white/50 hover:bg-white/80"
                    }`}
                  />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-2 right-2 z-20 hidden items-center justify-between sm:flex">
                <button
                  type="button"
                  aria-label="Previous slide"
                  onClick={scrollPrev}
                  className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40"
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  aria-label="Next slide"
                  onClick={scrollNext}
                  className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40"
                >
                  <ChevronRight />
                </button>
              </div>
            </>
          ) : null}
        </div>

        <div className="relative max-w-[520px] py-2 lg:py-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--brand-gold)]">
            <span aria-hidden className="mr-3">
              —
            </span>
            Made to feel like yours
          </p>
          <h1 className="mt-5 font-display text-[46px] font-medium leading-[0.95] tracking-[-0.03em] text-[var(--brand-ink)] sm:text-[58px] lg:text-[68px]">
            Little details.
            <span className="mt-1 block font-display italic font-normal text-[var(--brand-gold)]">
              Big meaning.
            </span>
          </h1>
          <p className="mt-6 max-w-[38ch] text-[15px] leading-relaxed text-[var(--brand-muted)]">
            Custom apparel and thoughtful gifts that turn everyday things into something personal.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link
              href="/products"
              className="inline-flex items-center gap-3 bg-[var(--brand-ink)] px-5 py-3 text-[13px] font-medium text-[#f6f1e8] transition hover:bg-black"
            >
              Explore the collection
              <span aria-hidden className="text-[15px]">
                ↗
              </span>
            </Link>
            <Link
              href="/pages/about"
              className="text-[14px] text-[var(--brand-ink)] underline-offset-4 hover:underline"
            >
              Get to know us
            </Link>
          </div>
          <div className="mt-10 border-t border-[var(--brand-ink)]/15 pt-4">
            <p className="flex flex-wrap gap-x-8 gap-y-1 text-[12px] text-[var(--brand-muted)]">
              <span>Made with intention</span>
              <span>Personalised in India</span>
            </p>
          </div>
        </div>
        <span
          className="pointer-events-none absolute right-6 top-8 hidden font-display text-[28px] italic text-[var(--brand-gold)]/70 lg:block"
          aria-hidden
        >
          p*
        </span>
      </div>
    </section>
  );
}
