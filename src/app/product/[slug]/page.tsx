import { redirect } from "next/navigation";

export default async function LegacyProductPathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = typeof slug === "string" ? slug.trim() : "";
  if (!s) redirect("/products");
  redirect(`/products/${encodeURIComponent(s)}`);
}
