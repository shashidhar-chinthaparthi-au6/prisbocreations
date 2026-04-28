import Image from "next/image";
import Link from "next/link";

const RECIPIENT_CARDS = [
  {
    key: "him",
    label: "For him",
    href: "/for/him",
    image:
      "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=600&h=700&fit=crop&q=80",
    overlayColor: "rgba(26, 34, 52, 0.55)",
  },
  {
    key: "her",
    label: "For her",
    href: "/for/her",
    image:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=700&fit=crop&q=80",
    overlayColor: "rgba(107, 26, 46, 0.55)",
  },
  {
    key: "kids",
    label: "For kids",
    href: "/for/kids",
    image:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=700&fit=crop&q=80",
    overlayColor: "rgba(139, 74, 14, 0.5)",
  },
  {
    key: "couples",
    label: "For couples",
    href: "/for/couples",
    image:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&h=700&fit=crop&q=80",
    overlayColor: "rgba(61, 26, 107, 0.55)",
  },
  {
    key: "corporate",
    label: "Corporate",
    href: "/for/corporate",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=700&fit=crop&q=80",
    overlayColor: "rgba(26, 58, 42, 0.55)",
  },
] as const;

type Props = {
  /** Narrow rail beside the hero: stacked rounded rows instead of wide tiles */
  variant?: "default" | "rail";
};

function RailChevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <polyline
        points="6 4 10 8 6 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RecipientCards({ variant = "default" }: Props) {
  if (variant === "rail") {
    return (
      <ul
        className="mt-0 flex h-auto max-w-none list-none flex-col gap-2.5 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-2"
        aria-label="Shop by recipient"
      >
        {RECIPIENT_CARDS.map((card) => (
          <li key={card.key} className="min-h-0 lg:flex lg:min-h-0 lg:flex-1">
            <Link
              href={card.href}
              className="group/item relative flex min-h-[56px] w-full shrink-0 items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-canvas)] px-3 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition duration-150 hover:z-[1] hover:border-[var(--brand-amber)]/45 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-amber)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-surface)] sm:px-3.5 lg:h-full lg:min-h-0 lg:flex-1 lg:px-4"
            >
              <span className="relative h-[46px] w-[46px] shrink-0 overflow-hidden rounded-xl ring-2 ring-black/[0.06] lg:h-[52px] lg:w-[52px]">
                <Image
                  src={card.image}
                  alt=""
                  width={52}
                  height={52}
                  className="h-full w-full object-cover transition duration-200 group-hover/item:scale-[1.04]"
                  sizes="(min-width: 1024px) 52px, 46px"
                />
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug tracking-tight text-[var(--brand-ink)] sm:text-base">
                {card.label}
              </span>
              <span className="text-[var(--brand-amber)] opacity-80 transition duration-150 group-hover/item:translate-x-0.5 group-hover/item:opacity-100">
                <RailChevron className="h-4 w-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {RECIPIENT_CARDS.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          className="group relative block aspect-[3/4] cursor-pointer overflow-hidden rounded-[12px] shadow-[var(--shadow-card)] ring-1 ring-black/10 transition duration-150 hover:scale-[1.02] hover:ring-black/20"
        >
          <Image
            src={card.image}
            alt={card.label}
            fill
            sizes="(max-width: 640px) 50vw, 20vw"
            className="object-cover"
            priority={false}
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-[250ms] ease-out group-hover:opacity-[0.72]"
            style={{ background: card.overlayColor }}
            aria-hidden
          />
          <div className="absolute bottom-5 left-5 z-[2] text-white">
            <p className="font-display text-lg font-bold leading-tight sm:text-[22px]">{card.label}</p>
            <p className="mt-1 text-[13px] text-white/75 underline-offset-2 group-hover:underline">Browse</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
