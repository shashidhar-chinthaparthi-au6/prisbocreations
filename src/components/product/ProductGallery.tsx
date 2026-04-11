"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StoreMedia } from "@/components/store/StoreMedia";
import { Spinner } from "@/components/ui/Spinner";

type Props = {
  images: string[];
  productName: string;
};

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
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

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
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

export function ProductGallery({ images, productName }: Props) {
  const [selected, setSelected] = useState(0);
  const [mainMediaLoading, setMainMediaLoading] = useState(false);
  const isInitialMain = useRef(true);

  const safeIndex = images.length ? Math.min(selected, images.length - 1) : 0;
  const mainSrc = images[safeIndex];

  useEffect(() => {
    if (isInitialMain.current) {
      isInitialMain.current = false;
      return;
    }
    setMainMediaLoading(true);
  }, [safeIndex, mainSrc]);

  const goPrev = useCallback(() => {
    setSelected((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    setSelected((i) => (i + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelected((i) => (i - 1 + images.length) % images.length);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelected((i) => (i + 1) % images.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length]);

  if (!images.length) {
    return (
      <div className="relative mx-auto aspect-square w-full max-w-[min(100%,min(420px,58vh))] overflow-hidden rounded-2xl border border-sand-deep bg-sand-deep" />
    );
  }

  const multi = images.length > 1;

  return (
    <div className="flex w-full flex-col gap-3">
      {/*
        Cap main stage so thumbnails stay on-screen: square fits in min(column, 520px, 62vh).
      */}
      <div className="mx-auto w-full max-w-[min(100%,min(520px,62vh))] shrink-0">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-sand-deep bg-sand-deep">
          <StoreMedia
            key={`${safeIndex}-${mainSrc}`}
            src={mainSrc}
            alt={`${productName} — image ${safeIndex + 1} of ${images.length}`}
            fill
            className="object-cover"
            priority={safeIndex === 0}
            sizes="(max-width: 1024px) 100vw, 50vw"
            videoControls
            onMediaReady={() => setMainMediaLoading(false)}
            onMediaError={() => setMainMediaLoading(false)}
          />
          {mainMediaLoading ? (
            <div
              className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-sand-deep/50 backdrop-blur-[1px]"
              aria-hidden
            >
              <Spinner size="lg" className="text-ink" />
            </div>
          ) : null}
          {multi ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/75 text-white shadow-md backdrop-blur-sm transition hover:bg-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/75 text-white shadow-md backdrop-blur-sm transition hover:bg-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <ChevronRight />
              </button>
              <p className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                {safeIndex + 1} / {images.length}
              </p>
            </>
          ) : null}
        </div>
      </div>
      {multi ? (
        <div
          className="flex min-h-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:flex-wrap sm:overflow-x-visible [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Product images"
        >
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              onClick={() => setSelected(i)}
              className={`relative h-16 w-16 shrink-0 snap-start overflow-hidden rounded-lg border-2 bg-sand-deep transition sm:h-20 sm:w-20 ${
                i === safeIndex
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-transparent opacity-80 hover:opacity-100"
              }`}
            >
              <StoreMedia
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                videoControls={false}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
