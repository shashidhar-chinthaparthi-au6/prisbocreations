const KEY = "prisbo_wishlist_guest";

export function readGuestWishlistIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toggleGuestWishlist(productId: string): boolean {
  const ids = readGuestWishlistIds();
  const i = ids.indexOf(productId);
  if (i === -1) ids.push(productId);
  else ids.splice(i, 1);
  localStorage.setItem(KEY, JSON.stringify(ids));
  return i === -1;
}

export function isGuestWishlisted(productId: string): boolean {
  return readGuestWishlistIds().includes(productId);
}
