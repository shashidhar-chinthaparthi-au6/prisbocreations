"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StoreMedia } from "@/components/store/StoreMedia";

type Props = {
  images: string[];
  productName: string;
  sizes: string;
};

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
        <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-white shadow" : "w-1.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
