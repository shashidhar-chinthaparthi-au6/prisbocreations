"use client";

import { useState } from "react";
import { StoreMedia } from "@/components/store/StoreMedia";

type Props = {
  images: string[];
  productName: string;
};

export function ProductGallery({ images, productName }: Props) {
  const [selected, setSelected] = useState(0);

  if (!images.length) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-sand-deep bg-sand-deep" />
    );
  }

  const safeIndex = Math.min(selected, images.length - 1);
  const mainSrc = images[safeIndex];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-sand-deep bg-sand-deep">
        <StoreMedia
          src={mainSrc}
          alt={productName}
          fill
          className="object-cover"
          priority={safeIndex === 0}
          videoControls
        />
      </div>
      {images.length > 1 ? (
        <div
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:flex-wrap sm:overflow-x-visible [&::-webkit-scrollbar]:hidden"
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
