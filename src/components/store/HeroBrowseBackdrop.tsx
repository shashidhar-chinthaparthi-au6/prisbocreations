/**
 * Slow horizontal image strips behind the home hero (category / product thumbs).
 * Duplicated sequence + translate -50% gives a seamless loop.
 */
export function HeroBrowseBackdrop({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;

  const rowA = urls;
  const rowB = [...urls].reverse();

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
      aria-hidden
    >
      <div className="absolute -left-8 right-0 top-[8%] opacity-[0.42] sm:top-[10%]">
        <div className="flex w-max gap-3 pr-3 motion-reduce:animate-none animate-hero-marquee-l sm:gap-4">
          {[...rowA, ...rowA].map((url, i) => (
            <div
              key={`a-${i}-${url.slice(-24)}`}
              className="h-24 w-36 shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-white/10 shadow-lg ring-1 ring-accent/20 sm:h-28 sm:w-44 md:h-32 md:w-52"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin CDN URLs */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover brightness-[0.92] saturate-[1.12] contrast-[1.03]"
                loading="eager"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -left-8 right-0 top-[42%] opacity-[0.36] sm:top-[40%]">
        <div className="flex w-max gap-3 pr-3 motion-reduce:animate-none animate-hero-marquee-r sm:gap-4">
          {[...rowB, ...rowB].map((url, i) => (
            <div
              key={`b-${i}-${url.slice(-24)}`}
              className="h-20 w-32 shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-white/10 shadow-lg ring-1 ring-rose-light/25 sm:h-24 sm:w-40 md:h-28 md:w-48"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin CDN URLs */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover brightness-[0.92] saturate-[1.12] contrast-[1.03]"
                loading="eager"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -left-6 bottom-[6%] opacity-[0.32] sm:bottom-[8%]">
        <div className="flex w-max gap-3 pr-3 motion-reduce:animate-none animate-hero-marquee-l [animation-duration:70s] sm:gap-4">
          {[...rowA, ...rowA].map((url, i) => (
            <div
              key={`c-${i}-${url.slice(-24)}`}
              className="h-[4.5rem] w-[6.5rem] shrink-0 overflow-hidden rounded-xl border border-white/25 bg-white/10 ring-1 ring-accent/15 sm:h-24 sm:w-36"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin CDN URLs */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover brightness-[0.92] saturate-[1.12] contrast-[1.03]"
                loading="eager"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
