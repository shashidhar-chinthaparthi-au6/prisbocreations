"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StoreMedia } from "@/components/store/StoreMedia";

type Props = {
  images: string[];
  productName: string;
  sizes: string;
};

function stopLink(e: React.SyntheticEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function ChevronLeft({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/** Horizontal snap + auto-advance for product cards in grid view (matches SubcategoryCard behavior). */
export function ProductGridCarousel({ images, productName, sizes }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = images.length;

  const scrollToSlide = useCallback(
    (i: number) => {
      const el = scrollerRef.current;
      if (!el || !n) return;
      const w = el.clientWidth;
      const next = ((i % n) + n) % n;
      el.scrollTo({ left: next * w, behavior: "smooth" });
      indexRef.current = next;
      setIndex(next);
    },
    [n],
  );

  const goPrev = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      stopLink(e);
      scrollToSlide(indexRef.current - 1);
    },
    [scrollToSlide],
  );

  const goNext = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      stopLink(e);
      scrollToSlide(indexRef.current + 1);
    },
    [scrollToSlide],
  );

  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = setInterval(() => {
      scrollToSlide(indexRef.current + 1);
    }, 4500);
    return () => clearInterval(t);
  }, [n, paused, scrollToSlide]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || n <= 1) return;
    const onScroll = () => {
      const w = el.clientWidth;
      if (w < 1) return;
      const i = Math.round(el.scrollLeft / w);
      const clamped = Math.min(Math.max(i, 0), n - 1);
      indexRef.current = clamped;
      setIndex(clamped);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [n]);

  if (n === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-sand-deep text-sm text-ink-muted">
        No image
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full bg-sand-deep"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => {
        window.setTimeout(() => setPaused(false), 3500);
      }}
    >
      <div
        ref={scrollerRef}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerDown={() => setPaused(true)}
        role={n > 1 ? "region" : undefined}
        aria-roledescription={n > 1 ? "carousel" : undefined}
        aria-label={n > 1 ? `${productName} — image gallery` : undefined}
      >
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-full w-full min-w-full shrink-0 snap-start"
          >
            <StoreMedia
              src={src}
              alt={`${productName} — ${i + 1}`}
              fill
              className="object-cover transition duration-500"
              sizes={sizes}
              videoControls={false}
            />
          </div>
        ))}
      </div>
      {n > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={goPrev}
            onPointerDown={stopLink}
            className="absolute left-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink/75 text-white shadow-md backdrop-blur-sm transition hover:bg-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={goNext}
            onPointerDown={stopLink}
            className="absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink/75 text-white shadow-md backdrop-blur-sm transition hover:bg-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight size={18} />
          </button>
          <div
            className="absolute bottom-2 left-0 right-0 z-[5] flex justify-center gap-1.5 px-10"
            role="tablist"
            aria-label="Slide indicators"
          >
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Image ${i + 1} of ${n}`}
                onClick={(e) => {
                  stopLink(e);
                  scrollToSlide(i);
                }}
                onPointerDown={stopLink}
                className="flex h-4 min-w-[0.5rem] items-center justify-center rounded-full p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all ${
                    i === index ? "w-5 bg-white shadow" : "w-1.5 bg-white/60"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
