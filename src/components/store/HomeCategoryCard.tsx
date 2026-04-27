"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CATEGORY_CARD_FALLBACK_BG } from "@/lib/category-hero-images";

type Props = {
  href: string;
  name: string;
  slug: string;
  imageSrc: string;
};

export function HomeCategoryCard({ href, name, slug, imageSrc }: Props) {
  const [showImage, setShowImage] = useState(true);
  const fallbackBg = CATEGORY_CARD_FALLBACK_BG[slug] ?? "#888888";

  return (
    <Link
      href={href}
      className="group relative flex h-full min-h-[160px] w-[160px] shrink-0 flex-col overflow-hidden rounded-2xl md:h-[160px] md:w-auto md:flex-none"
    >
      <div className="relative min-h-[120px] flex-1 md:aspect-auto md:min-h-[160px] md:h-full md:flex-none">
        <div
          className="absolute inset-0 z-0"
          style={{ backgroundColor: fallbackBg }}
          aria-hidden
        />
        {showImage ? (
          <Image
            src={imageSrc}
            alt={name}
            fill
            className="z-[1] object-cover transition duration-150 group-hover:scale-[1.03]"
            sizes="(max-width: 767px) 160px, (max-width: 1023px) 30vw, 20vw"
            onError={() => setShowImage(false)}
          />
        ) : null}
        <div className="absolute inset-0 z-[2] bg-[rgba(0,0,0,0.35)]" aria-hidden />
        <p className="absolute inset-x-0 bottom-0 z-[3] flex items-end justify-center p-3 text-center text-sm font-bold text-white">
          {name}
        </p>
      </div>
    </Link>
  );
}
