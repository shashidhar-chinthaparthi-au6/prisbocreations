/**
 * Secret used to sign Auth.js session JWTs and cookies.
 * Prefer `AUTH_SECRET`; falls back to `JWT_SECRET` so storefront auth works with one env var.
 */
export function getAuthJsSecret(): string | undefined {
  const s =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();
  return s || undefined;
}
