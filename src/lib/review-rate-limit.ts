/** Simple in-memory sliding windows for serverless-friendly soft limits (best-effort). */

type Bucket = { t: number; count: number };

const REVIEW_SUBMIT = new Map<string, Bucket>();
const GUEST_VERIFY = new Map<string, Bucket>();

function prune(map: Map<string, Bucket>, windowMs: number) {
  const now = Date.now();
  for (const [k, b] of map) {
    if (now - b.t > windowMs) map.delete(k);
  }
}

/** Max 5 review submissions per user per 24h. */
export function reviewSubmitAllowUser(userId: string): boolean {
  prune(REVIEW_SUBMIT, 86_400_000);
  const now = Date.now();
  const key = userId;
  const b = REVIEW_SUBMIT.get(key);
  if (!b || now - b.t > 86_400_000) {
    REVIEW_SUBMIT.set(key, { t: now, count: 1 });
    return true;
  }
  if (b.count >= 5) return false;
  b.count += 1;
  return true;
}

/** Max 5 guest verify attempts per email per hour. */
export function guestVerifyAllowEmail(emailNorm: string): boolean {
  prune(GUEST_VERIFY, 3_600_000);
  const now = Date.now();
  const key = emailNorm.toLowerCase();
  const b = GUEST_VERIFY.get(key);
  if (!b || now - b.t > 3_600_000) {
    GUEST_VERIFY.set(key, { t: now, count: 1 });
    return true;
  }
  if (b.count >= 5) return false;
  b.count += 1;
  return true;
}
