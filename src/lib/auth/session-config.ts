/**
 * Session cookie max-age and JWT lifetime (seconds).
 * Override with SESSION_MAX_AGE_SECONDS (60–31536000).
 */
export function getSessionMaxAgeSeconds(): number {
  const raw = process.env.SESSION_MAX_AGE_SECONDS;
  if (raw !== undefined && raw !== "") {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 60 && n <= 60 * 60 * 24 * 365) {
      return n;
    }
  }
  return 60 * 60 * 24 * 7;
}
