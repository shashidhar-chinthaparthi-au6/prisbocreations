import { z } from "zod";

export type HomeHeroSlide = {
  image: string;
  kicker: string;
  title: string;
  description: string;
};

export const homeHeroSlideSchema = z.object({
  image: z.string().min(1, "Image URL is required").max(4000),
  kicker: z.string().min(1).max(200),
  title: z.string().min(1).max(800),
  description: z.string().min(1).max(2000),
});

export const homeHeroConfigBodySchema = z.object({
  slides: z.array(homeHeroSlideSchema).min(1, "Add at least one slide").max(10),
});

export type HomeHeroConfigBody = z.infer<typeof homeHeroConfigBodySchema>;

export const DEFAULT_HOME_HERO_SLIDES: HomeHeroSlide[] = [
  {
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1600&q=85",
    kicker: "Prisbo Creations",
    title: "We craft personalised gifts and keepsakes — in our studio, not from a faceless warehouse.",
    description:
      "Laser-cut acrylic, careful print finishing, and packaging you'll be proud to hand over.",
  },
  {
    image: "https://images.unsplash.com/photo-1513201099705-a9746e1e2010?w=1600&q=85",
    kicker: "Made for them",
    title: "Gifts that feel considered — for birthdays, weddings, and every milestone in between.",
    description: "Names, dates, and photos turned into display-worthy pieces, shipped with care across India.",
  },
  {
    image: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=1600&q=85",
    kicker: "Studio quality",
    title: "Crisp edges, true colours, and finish you can see before you unbox.",
    description: "We obsess over the small details so your present lands exactly as you imagined it.",
  },
];
