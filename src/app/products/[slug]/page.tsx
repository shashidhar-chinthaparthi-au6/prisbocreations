import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { getProductBreadcrumb } from "@/lib/services/catalogService";
import { ProductPageClient } from "@/components/product/ProductPageClient";
import {
  buildProductPageClientPropsFromDoc,
  productJsonLdBasics,
} from "@/lib/product-page-client-props";
import mongoose from "mongoose";
import { Review } from "@/lib/models/Review";
import { User } from "@/lib/models/User";

export const revalidate = 30;

async function productSlugFromParams(
  params: Promise<{ slug: string }>,
): Promise<string> {
  const raw = await params;
  const slug = raw && typeof raw.slug === "string" ? raw.slug.trim() : "";
  return slug;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const slug = await productSlugFromParams(params);
  if (!slug) return { title: "Product" };
  await connectDb();
  const nav = await getProductBreadcrumb(slug);
  const name = nav?.product?.name ?? "Product";
  const desc =
    typeof nav?.product?.description === "string"
      ? nav.product.description.replace(/<[^>]+>/g, "").slice(0, 160)
      : "Personalised gift from Prisbo Creations.";
  const img = Array.isArray(nav?.product?.images) ? nav?.product?.images?.[0] : undefined;
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const url = `${base}/products/${slug}`;
  return {
    title: name,
    description: desc,
    openGraph: {
      title: name,
      description: desc,
      url,
      ...(typeof img === "string" && img ? { images: [{ url: img }] } : {}),
    },
    alternates: { canonical: `/products/${slug}` },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = await productSlugFromParams(params);
  if (!slug) notFound();
  await connectDb();
  const nav = await getProductBreadcrumb(slug);
  if (!nav?.product) notFound();

  const { product: p, category: cat, subcategory: sub } = nav;

  const clientProps = buildProductPageClientPropsFromDoc(p, cat, sub);

  const { primaryImage, listPricePaise, effStock } = productJsonLdBasics(p);

  const pid = p._id as mongoose.Types.ObjectId;
  const [aggRow, approvedReviews] = await Promise.all([
    Review.aggregate<{ avg: number; c: number }>([
      { $match: { productId: pid, isApproved: true, isRejected: { $ne: true } } },
      { $group: { _id: null, avg: { $avg: "$rating" }, c: { $sum: 1 } } },
    ]),
    Review.find({ productId: pid, isApproved: true, isRejected: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("rating body guestName createdAt")
      .populate<{ userId?: { name?: string } | null }>({ path: "userId", model: User, select: "name" })
      .lean(),
  ]);
  const reviewCount = aggRow[0]?.c ?? 0;
  const avgRating = aggRow[0]?.avg != null ? Math.round(aggRow[0].avg * 10) / 10 : 0;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    image: primaryImage ? [primaryImage] : undefined,
    offers: {
      "@type": "Offer",
      price: (listPricePaise / 100).toFixed(2),
      priceCurrency: "INR",
      availability:
        effStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  if (reviewCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avgRating.toFixed(1),
      reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
    jsonLd.review = approvedReviews.map((r) => {
      const u = r.userId && typeof r.userId === "object" && "name" in r.userId ? r.userId : null;
      const name = u?.name?.trim() || r.guestName?.trim() || "Customer";
      return {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: r.rating,
        },
        author: {
          "@type": "Person",
          name,
        },
        reviewBody: r.body,
        datePublished: r.createdAt
          ? new Date(r.createdAt).toISOString().split("T")[0]
          : undefined,
      };
    });
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductPageClient {...clientProps} />
    </>
  );
}
