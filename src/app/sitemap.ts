import type { MetadataRoute } from "next";
import { connectDb } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { Category } from "@/lib/models/Category";
import { storefrontPublishedMatch } from "@/lib/services/storefrontCatalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  await connectDb();
  const [products, categories] = await Promise.all([
    Product.find(storefrontPublishedMatch()).select("slug updatedAt").lean(),
    Category.find().select("slug updatedAt").lean(),
  ]);

  const staticPaths = [
    "",
    "/products",
    "/categories",
    "/search",
    "/cart",
    "/checkout",
    "/track",
    "/bulk",
    "/login",
    "/register",
    "/pages/about",
    "/pages/contact",
    "/pages/faq",
    "/pages/shipping",
    "/pages/returns",
    "/pages/privacy",
    "/pages/terms",
  ];

  const out: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  for (const p of products) {
    if (!p.slug) continue;
    out.push({
      url: `${base}/products/${p.slug}`,
      lastModified: (p as { updatedAt?: Date }).updatedAt ?? new Date(),
    });
  }

  for (const c of categories) {
    if (!c.slug) continue;
    out.push({
      url: `${base}/category/${c.slug}`,
      lastModified: (c as { updatedAt?: Date }).updatedAt ?? new Date(),
    });
  }

  for (const r of ["him", "her", "kids", "couples", "corporate"] as const) {
    out.push({ url: `${base}/for/${r}`, lastModified: new Date() });
  }

  return out;
}
