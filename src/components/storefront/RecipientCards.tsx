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

export function RecipientCards() {
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
            <p className="mt-1 text-[13px] text-white/75 underline-offset-2 group-hover:underline">
              Browse
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
