import Image from "next/image";
import Link from "next/link";

type Props = {
  name: string;
  description?: string;
  imageUrl?: string | null;
  subcategoryCount: number;
  productCount: number;
};

function FallbackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10 text-white/80" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 16l5-5 4 4 5-6 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CategoryHero({
  name,
  description,
  imageUrl,
  subcategoryCount,
  productCount,
}: Props) {
  return (
    <div className="relative overflow-hidden bg-[#1A1A1A] text-white">
      <div className="mx-auto flex max-w-[1400px] items-start gap-4 px-4 py-8 sm:gap-6 sm:px-6 sm:py-10">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-white/10 sm:h-20 sm:w-20">
          {imageUrl ? (
            <Image src={imageUrl} alt="" fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FallbackIcon />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-normal sm:text-2xl">{name}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/65 sm:text-sm">{description}</p>
          ) : null}
          <p className="mt-3 text-xs text-white/55 sm:text-sm">
            <span className="tabular-nums">{subcategoryCount}</span> subcategories ·{" "}
            <span className="tabular-nums">{productCount}</span> products
          </p>
          <p className="mt-2 text-[11px] text-white/45 sm:text-xs">
            <Link href="/products" className="underline decoration-white/30 underline-offset-2 hover:text-white">
              All products
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
