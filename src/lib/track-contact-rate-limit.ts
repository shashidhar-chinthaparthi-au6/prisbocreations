import crypto from "crypto";

type Bucket = { count: number; resetAt: number };

const ipBuckets = new Map<string, Bucket>();
const contactBuckets = new Map<string, Bucket>();
const ipFailures = new Map<string, { count: number; resetAt: number }>();

const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_LIMIT = 5;
const CONTACT_WINDOW_MS = 60 * 60 * 1000;
const CONTACT_LIMIT = 3;
const FAILURE_WINDOW_MS = 60 * 60 * 1000;

function allowBucket(map: Map<string, Bucket>, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = map.get(key);
  if (!b || now > b.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

export function trackContactAllowIp(ip: string): boolean {
  return allowBucket(ipBuckets, `ip:${ip}`, IP_LIMIT, IP_WINDOW_MS);
}

export function trackContactAllowContact(normalizedKey: string): boolean {
  const h = crypto.createHash("sha256").update(normalizedKey).digest("hex").slice(0, 32);
  return allowBucket(contactBuckets, `c:${h}`, CONTACT_LIMIT, CONTACT_WINDOW_MS);
}

export function trackContactFailureCount(ip: string): number {
  const now = Date.now();
  const f = ipFailures.get(ip);
  if (!f || now > f.resetAt) return 0;
  return f.count;
}

export function trackContactRecordFailure(ip: string): number {
  const now = Date.now();
  const f = ipFailures.get(ip);
  if (!f || now > f.resetAt) {
    ipFailures.set(ip, { count: 1, resetAt: now + FAILURE_WINDOW_MS });
    return 1;
  }
  f.count += 1;
  return f.count;
}

export function trackContactResetFailures(ip: string): void {
  ipFailures.delete(ip);
}

export function trackContactRequiresCaptcha(ip: string): boolean {
  return trackContactFailureCount(ip) >= 2;
}
