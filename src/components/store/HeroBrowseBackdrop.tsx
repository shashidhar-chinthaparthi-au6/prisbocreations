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
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl md:rounded-3xl"
      aria-hidden
    >
      <div className="absolute -left-8 right-0 top-[6%] opacity-[0.42] sm:top-[8%]">
        <div className="flex w-max gap-2 pr-2 motion-reduce:animate-none animate-hero-marquee-l sm:gap-3 sm:pr-3">
          {[...rowA, ...rowA].map((url, i) => (
            <div
              key={`a-${i}-${url.slice(-24)}`}
              className="h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-white/25 bg-white/10 shadow-lg ring-1 ring-accent/20 sm:h-24 sm:w-40 md:h-28 md:w-48"
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
      <div className="absolute -left-8 right-0 top-[38%] opacity-[0.36] sm:top-[36%]">
        <div className="flex w-max gap-2 pr-2 motion-reduce:animate-none animate-hero-marquee-r sm:gap-3 sm:pr-3">
          {[...rowB, ...rowB].map((url, i) => (
            <div
              key={`b-${i}-${url.slice(-24)}`}
              className="h-[4.5rem] w-[6.5rem] shrink-0 overflow-hidden rounded-xl border border-white/25 bg-white/10 shadow-lg ring-1 ring-rose-light/25 sm:h-20 sm:w-36 md:h-24 md:w-44"
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
      <div className="absolute -left-6 bottom-[4%] opacity-[0.32] sm:bottom-[6%]">
        <div className="flex w-max gap-2 pr-2 motion-reduce:animate-none animate-hero-marquee-l [animation-duration:70s] sm:gap-3 sm:pr-3">
          {[...rowA, ...rowA].map((url, i) => (
            <div
              key={`c-${i}-${url.slice(-24)}`}
              className="h-16 w-[5.5rem] shrink-0 overflow-hidden rounded-lg border border-white/25 bg-white/10 ring-1 ring-accent/15 sm:h-[4.5rem] sm:w-32"
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
