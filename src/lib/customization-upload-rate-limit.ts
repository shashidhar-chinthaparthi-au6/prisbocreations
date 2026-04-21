type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 20;

export function customizationUploadAllowIp(ip: string): boolean {
  const key = ip.trim() || "unknown";
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= LIMIT) return false;
  b.count += 1;
  return true;
}
