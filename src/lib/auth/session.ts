import { cookies } from "next/headers";
import type { JwtPayload } from "./jwt";
import { verifyAccessToken } from "./jwt";

const COOKIE = "prisbo_session";

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
}

export async function getSession(secret: string): Promise<JwtPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    return verifyAccessToken(raw, secret);
  } catch {
    return null;
  }
}

export function getSessionFromCookieHeader(
  cookieHeader: string | null,
  secret: string
): JwtPayload | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((s) => s.trim());
  for (const p of parts) {
    if (p.startsWith(`${COOKIE}=`)) {
      const raw = decodeURIComponent(p.slice(COOKIE.length + 1));
      try {
        return verifyAccessToken(raw, secret);
      } catch {
        return null;
      }
    }
  }
  return null;
}
