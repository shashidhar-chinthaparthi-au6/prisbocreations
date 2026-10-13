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
  const fallbackBg = CATEGORY_CARD_FALLBACK_BG[slug] ?? "#c4a265";

  return (
    <Link href={href} className="group relative block h-[220px] overflow-hidden rounded-[20px] lg:h-[260px]">
      {/* Fallback background */}
      <div className="absolute inset-0 z-0" style={{ backgroundColor: fallbackBg }} />

      {/* Product image */}
      {showImage && (
        <Image
          src={imageSrc}
          alt={name}
          fill
          className="z-[1] object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          sizes="(max-width: 767px) 160px, (max-width: 1023px) 30vw, 20vw"
          onError={() => setShowImage(false)}
        />
      )}

      {/* Gradient overlay: transparent top → rich dark bottom */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-[rgba(15,8,4,0.75)] via-[rgba(15,8,4,0.2)] to-transparent" />

      {/* Text */}
      <div className="absolute inset-x-0 bottom-0 z-[3] p-4">
        <p className="font-display text-[18px] font-medium leading-tight text-white">{name}</p>
        <p className="mt-1 flex items-center gap-1 text-[12px] text-white/75 group-hover:text-white transition-colors">
          Shop now
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1" aria-hidden>
            →
          </span>
        </p>
      </div>
    </Link>
  );
}
