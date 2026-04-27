import type { JWT } from "@auth/core/jwt";
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

/**
 * Signed (JWS) session tokens for Auth.js — avoids JWE + DecompressionStream, which breaks Edge middleware.
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware#runtime
 */
export async function authJwtEncode(params: {
  token?: JWT;
  secret: string | string[];
  salt: string;
  maxAge?: number;
}): Promise<string> {
  const { token = {}, secret, maxAge = 30 * 24 * 60 * 60 } = params;
  const keyMaterial = Array.isArray(secret) ? secret[0] : secret;
  const key = new TextEncoder().encode(keyMaterial);
  const exp = Math.floor(Date.now() / 1000) + maxAge;
  return new SignJWT(token as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);
}

export async function authJwtDecode(params: {
  token?: string;
  secret: string | string[];
  salt: string;
}): Promise<JWT | null> {
  const { token, secret } = params;
  if (!token) return null;
  const secrets = Array.isArray(secret) ? secret : [secret];
  for (const s of secrets) {
    try {
      const key = new TextEncoder().encode(s);
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
      return payload as JWT;
    } catch {
      /* try next secret */
    }
  }
  return null;
}
