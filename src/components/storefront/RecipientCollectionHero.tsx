import Image from "next/image";
import Link from "next/link";

type Props = {
  title: string;
  description: string;
  imageUrl: string;
  overlayColor: string;
  productCount: number;
};

export function RecipientCollectionHero({
  title,
  description,
  imageUrl,
  overlayColor,
  productCount,
}: Props) {
  return (
    <div className="relative isolate min-h-[200px] overflow-hidden sm:min-h-[240px]">
      <Image
        src={imageUrl}
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: overlayColor }}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-[1400px] flex-col justify-end px-4 py-10 text-white sm:px-6 sm:py-12">
        <h1 className="font-display text-2xl font-normal sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-[15px]">{description}</p>
        <p className="mt-4 text-xs text-white/70 sm:text-sm">
          <span className="tabular-nums">{productCount}</span> products
        </p>
        <p className="mt-2 text-[11px] text-white/55 sm:text-xs">
          <Link href="/products" className="underline decoration-white/30 underline-offset-2 hover:text-white">
            All products
          </Link>
        </p>
      </div>
    </div>
  );
}
