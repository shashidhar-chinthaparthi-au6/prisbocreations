"use client";

import { useEffect, useState } from "react";
import {
  AUTH_MARKETING_IMAGE_URLS,
  AUTH_MARKETING_SLIDES,
} from "@/components/auth/auth-marketing-data";

export function AuthMarketingPanel() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlide((s) => (s + 1) % AUTH_MARKETING_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, []);

  const urls = [...AUTH_MARKETING_IMAGE_URLS];
  const rowA = urls;
  const rowB = [...urls].reverse();

  return (
    <div className="relative flex min-h-[16rem] flex-col justify-end overflow-hidden md:h-full md:min-h-0 md:justify-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-12 right-0 top-[8%] opacity-[0.4] md:-left-16 md:top-[10%]">
          <div className="flex w-max gap-2.5 pr-2 motion-reduce:animate-none animate-hero-marquee-l sm:gap-3 sm:pr-3 [animation-duration:52s] md:gap-3.5 md:pr-3.5 lg:[animation-duration:60s]">
            {[...rowA, ...rowA].map((url, i) => (
              <div
                key={`a-${i}`}
                className="h-[4.5rem] w-[7.25rem] shrink-0 overflow-hidden rounded-lg border border-white/20 bg-white/10 shadow-md ring-1 ring-white/15 sm:h-24 sm:w-36 md:h-28 md:w-44 lg:h-32 lg:w-52"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote Unsplash */}
                <img src={url} alt="" className="h-full w-full object-cover brightness-[0.9] saturate-[1.08]" />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute -left-12 right-0 top-[40%] opacity-[0.34] md:-left-16 md:top-[38%]">
          <div className="flex w-max gap-2.5 pr-2 motion-reduce:animate-none animate-hero-marquee-r sm:gap-3 sm:pr-3 [animation-duration:58s] md:gap-3.5 md:pr-3.5 lg:[animation-duration:68s]">
            {[...rowB, ...rowB].map((url, i) => (
              <div
                key={`b-${i}`}
                className="h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-white/10 shadow-md ring-1 ring-white/15 sm:h-[5.25rem] sm:w-40 md:h-28 md:w-48 lg:h-32 lg:w-56"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote Unsplash */}
                <img src={url} alt="" className="h-full w-full object-cover brightness-[0.9] saturate-[1.08]" />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute -left-10 bottom-[6%] opacity-[0.3] md:-left-14 md:bottom-[10%]">
          <div className="flex w-max gap-2.5 pr-2 motion-reduce:animate-none animate-hero-marquee-l sm:gap-3 sm:pr-3 [animation-duration:70s] md:gap-3.5 md:pr-3.5">
            {[...rowA, ...rowA].map((url, i) => (
              <div
                key={`c-${i}`}
                className="h-[4.25rem] w-[6.5rem] shrink-0 overflow-hidden rounded-md border border-white/15 bg-white/10 ring-1 ring-white/10 sm:h-20 sm:w-32 md:h-24 md:w-40 lg:h-28 lg:w-48"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote Unsplash */}
                <img src={url} alt="" className="h-full w-full object-cover brightness-[0.9] saturate-[1.08]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-950/90 via-ink/85 to-amber-950/80" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-accent/25 via-transparent to-rose-light/30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/78 via-black/38 to-transparent md:bg-gradient-to-r md:from-black/72 md:via-black/25 md:to-black/10" />

      <div className="relative z-10 px-6 pb-8 pt-20 text-white sm:px-10 sm:pb-10 sm:pt-24 md:px-12 md:py-16 md:pt-16 lg:px-16 lg:py-20 xl:px-20 xl:py-24">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-amber-100/90 sm:text-xs md:text-sm">
          Prisbo Creations
        </p>
        <div className="relative mt-4 min-h-[6rem] sm:min-h-[6.75rem] md:mt-6 md:min-h-[7.5rem] lg:min-h-[8.5rem]">
          {AUTH_MARKETING_SLIDES.map((s, i) => (
            <div
              key={s.title}
              className={`transition duration-700 ease-out ${
                i === slide ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
              }`}
            >
              <h2 className="max-w-xl font-display text-2xl leading-snug sm:text-3xl md:text-4xl md:leading-tight lg:text-[2.75rem] lg:leading-tight xl:max-w-2xl xl:text-5xl xl:leading-[1.1]">
                {s.title}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-sand/92 sm:text-base md:mt-4 md:max-w-xl md:text-lg lg:text-xl [text-shadow:0_1px_14px_rgba(0,0,0,0.35)]">
                {s.subtitle}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2 md:mt-8">
          {AUTH_MARKETING_SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 md:h-2 ${
                i === slide ? "w-8 bg-amber-100 md:w-10" : "w-1.5 bg-white/35 md:w-2"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
