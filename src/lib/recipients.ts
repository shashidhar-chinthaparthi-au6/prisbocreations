export const RECIPIENT_SLUGS = ["him", "her", "kids", "couples", "corporate"] as const;

export type RecipientSlug = (typeof RECIPIENT_SLUGS)[number];

export const RECIPIENT_META: Record<
  RecipientSlug,
  {
    title: string;
    description: string;
    image: string;
    color: string;
  }
> = {
  him: {
    title: "For him",
    description: "Thoughtful personalised gifts for the men in your life.",
    image:
      "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=1200&h=400&fit=crop&q=80",
    color: "#1A2234",
  },
  her: {
    title: "For her",
    description: "Beautiful keepsakes and personalised gifts for her.",
    image:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200&h=400&fit=crop&q=80",
    color: "#6B1A2E",
  },
  kids: {
    title: "For kids",
    description: "Fun and personalised gifts children will love.",
    image:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1200&h=400&fit=crop&q=80",
    color: "#8B4A0E",
  },
  couples: {
    title: "For couples",
    description: "Romantic and personalised gifts for two.",
    image:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1200&h=400&fit=crop&q=80",
    color: "#3D1A6B",
  },
  corporate: {
    title: "Corporate gifting",
    description: "Branded and bulk personalised gifts for your team and clients.",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop&q=80",
    color: "#1A3A2A",
  },
};

export function parseRecipientSlug(raw: string | undefined): RecipientSlug | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  return (RECIPIENT_SLUGS as readonly string[]).includes(s) ? (s as RecipientSlug) : null;
}

export const ADMIN_RECIPIENT_OPTIONS: { slug: RecipientSlug; label: string }[] = [
  { slug: "him", label: "For him" },
  { slug: "her", label: "For her" },
  { slug: "kids", label: "For kids" },
  { slug: "couples", label: "For couples" },
  { slug: "corporate", label: "Corporate" },
];
