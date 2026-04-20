const STORAGE_KEY = "prisbo_recently_viewed";
const MAX = 20;

export function recordRecentlyViewedProductId(productId: string): void {
  if (typeof window === "undefined" || !productId.trim()) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    let list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!Array.isArray(list)) list = [];
    list = list.filter((id) => id && id !== productId);
    list.unshift(productId);
    list = list.slice(0, MAX);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function readRecentlyViewedProductIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
