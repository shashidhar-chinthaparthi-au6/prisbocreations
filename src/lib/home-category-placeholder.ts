/** Unsplash placeholders for homepage category cards until CMS images are set. */
export function categoryCardPlaceholderImage(slug: string, name: string): string {
  const s = `${slug} ${name}`.toLowerCase();
  if (/(paper|packag|wrap)/.test(s)) {
    return "https://source.unsplash.com/400x400/?gift,wrapping";
  }
  if (/(acrylic|resin)/.test(s)) {
    return "https://source.unsplash.com/400x400/?acrylic,keychain";
  }
  if (/(stationery|desk|notebook)/.test(s)) {
    return "https://source.unsplash.com/400x400/?notebook,stationery";
  }
  if (/(home|decor|lifestyle|coaster)/.test(s)) {
    return "https://source.unsplash.com/400x400/?coaster,home,decor";
  }
  if (/(textile|apparel|tshirt|mug|fabric)/.test(s)) {
    return "https://source.unsplash.com/400x400/?custom,tshirt,mug";
  }
  return "https://source.unsplash.com/400x400/?gift,personalized";
}
