"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  href: string;
  name: string;
  description?: string;
  imageUrls: string[];
};

export function SubcategoryCard({ href, name, description, imageUrls }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = imageUrls.length;

  const scrollToSlide = useCallback((i: number) => {
    const el = scrollerRef.current;
    if (!el || !n) return;
    const w = el.clientWidth;
    const next = ((i % n) + n) % n;
    el.scrollTo({ left: next * w, behavior: "smooth" });
    indexRef.current = next;
    setIndex(next);
  }, [n]);

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

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-sand-deep bg-white shadow-sm transition hover:border-accent hover:shadow-md"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => {
        window.setTimeout(() => setPaused(false), 3500);
      }}
    >
      <div
        className="relative aspect-[16/10] w-full bg-sand-deep"
        onPointerDown={() => setPaused(true)}
      >
        {n > 0 ? (
          <>
            <div
              ref={scrollerRef}
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {imageUrls.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="relative h-full w-full min-w-full shrink-0 snap-start"
                >
                  <Image
                    src={src}
                    alt={`${name} — preview ${i + 1}`}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.02]"
                    sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
            {n > 1 ? (
              <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {imageUrls.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? "w-5 bg-white shadow" : "w-1.5 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sand-deep to-sand text-sm text-ink-muted">
            No preview images
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-display text-lg text-ink group-hover:text-accent">{name}</h2>
        {description ? (
          <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{description}</p>
        ) : null}
        <p className="mt-4 text-sm font-medium text-accent">View products →</p>
      </div>
    </Link>
  );
}
