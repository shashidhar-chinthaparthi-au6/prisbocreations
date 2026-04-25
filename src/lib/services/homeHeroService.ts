import type { HomeHeroSlide } from "@/lib/home-hero";
import { DEFAULT_HOME_HERO_SLIDES, homeHeroConfigBodySchema } from "@/lib/home-hero";
import { HomeHeroConfig } from "@/lib/models/HomeHeroConfig";

const KEY = "default";

function isValidSlide(s: unknown): s is HomeHeroSlide {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.image === "string" &&
    o.image.trim().length > 0 &&
    typeof o.kicker === "string" &&
    typeof o.title === "string" &&
    typeof o.description === "string"
  );
}

function normalizeSlides(raw: unknown): HomeHeroSlide[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidSlide).map((x) => ({
    image: x.image.trim(),
    kicker: x.kicker.trim(),
    title: x.title.trim(),
    description: x.description.trim(),
  }));
}

export async function getStorefrontHomeHeroSlides(): Promise<HomeHeroSlide[]> {
  const doc = await HomeHeroConfig.findOne({ singletonKey: KEY }).lean();
  const slides = doc?.slides ? normalizeSlides(doc.slides) : [];
  if (slides.length) return slides;
  return DEFAULT_HOME_HERO_SLIDES;
}

export async function getAdminHomeHeroConfig(): Promise<{ slides: HomeHeroSlide[]; usingDefaults: boolean }> {
  const doc = await HomeHeroConfig.findOne({ singletonKey: KEY }).lean();
  const slides = doc?.slides ? normalizeSlides(doc.slides) : [];
  if (slides.length) {
    return { slides, usingDefaults: false };
  }
  return { slides: DEFAULT_HOME_HERO_SLIDES, usingDefaults: true };
}

export async function replaceHomeHeroSlides(
  input: unknown,
): Promise<{ slides: HomeHeroSlide[]; usingDefaults: false }> {
  const body = homeHeroConfigBodySchema.parse(input);
  await HomeHeroConfig.findOneAndUpdate(
    { singletonKey: KEY },
    { $set: { slides: body.slides } },
    { upsert: true, new: true },
  );
  return { slides: body.slides, usingDefaults: false };
}
