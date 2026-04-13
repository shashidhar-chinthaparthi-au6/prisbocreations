const STORAGE_KEY = "prisbo_recent_v1";

export type RecentProduct = {
  slug: string;
  name: string;
  pricePaise: number;
  image: string;
};

export function recordRecentlyViewed(item: RecentProduct): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    let list: RecentProduct[] = raw ? (JSON.parse(raw) as RecentProduct[]) : [];
    if (!Array.isArray(list)) list = [];
    list = list.filter((x) => x && x.slug !== item.slug);
    list.unshift(item);
    list = list.slice(0, 12);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function readRecentlyViewed(): RecentProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as RecentProduct[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
