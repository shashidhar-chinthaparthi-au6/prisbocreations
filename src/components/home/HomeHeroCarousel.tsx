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
      role="region"
      aria-label="Featured highlights"
      aria-roledescription="carousel"
    >
      <div className="overflow-hidden rounded-none" ref={emblaRef}>
        <div className="flex">
          {slides.map((s, i) => (
            <div key={`${s.image}-${i}`} className="min-w-0 shrink-0 grow-0 basis-full">
              <div className="relative min-h-[360px] overflow-hidden md:min-h-[420px] lg:min-h-[520px]">
                <Image
                  src={s.image}
                  alt=""
                  fill
                  priority={i === 0}
                  className="object-cover"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-[rgba(20,15,10,0.45)]" aria-hidden />
                <div className="relative z-10 flex min-h-[360px] max-w-[540px] flex-col justify-center px-5 py-10 md:min-h-[420px] md:max-w-[420px] md:px-8 lg:min-h-[520px] lg:max-w-[540px] lg:px-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--brand-amber-light)] sm:text-sm">
                    {s.kicker}
                  </p>
                  {i === 0 ? (
                    <h1 className="mt-3 font-display text-[28px] font-bold leading-tight text-white md:text-[40px] md:leading-snug lg:text-[48px]">
                      {s.title}
                    </h1>
                  ) : (
                    <h2 className="mt-3 font-display text-[28px] font-bold leading-tight text-white md:text-[40px] md:leading-snug lg:text-[48px]">
                      {s.title}
                    </h2>
                  )}
                  <p className="mt-4 max-w-xl text-base text-white/85 sm:text-base">{s.description}</p>
                  <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link href="/products" className="btn-primary min-h-12 w-full justify-center px-8 sm:w-auto">
                      Shop the catalog
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-full border-[1.5px] border-white bg-transparent px-8 text-sm font-medium tracking-wide text-white transition duration-150 hover:bg-white/10 sm:w-auto"
                    >
                      Create account
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {multi ? (
        <>
          <div
            className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-1.5 px-4 md:bottom-5"
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
                className={`pointer-events-auto h-2 w-2 rounded-full transition-all duration-200 ${
                  i === index ? "w-6 bg-white" : "bg-white/45 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-2 right-2 z-20 hidden items-center justify-between sm:flex">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={scrollPrev}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-[rgba(20,15,10,0.35)] text-white backdrop-blur-sm transition hover:bg-[rgba(20,15,10,0.5)]"
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={scrollNext}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-[rgba(20,15,10,0.35)] text-white backdrop-blur-sm transition hover:bg-[rgba(20,15,10,0.5)]"
            >
              <ChevronRight />
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
