import type { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { getSession } from "@/lib/auth/session";
import type { JwtPayload } from "@/lib/auth/jwt";
import { jsonError } from "./response";

async function authSession(): Promise<Session | null> {
  return (await auth()) as Session | null;
}

function sessionFromNextAuth(na: Session | null): JwtPayload | null {
  const id = na?.user?.id;
  if (!id) return null;
  const roleRaw = (na.user as { role?: string }).role;
  const role: JwtPayload["role"] = roleRaw === "admin" ? "admin" : "customer";
  return {
    sub: id,
    email: na.user?.email ?? "",
    role,
  };
}

/** Returns the current user session, or null if not signed in. */
export async function getOptionalAuth(): Promise<JwtPayload | null> {
  const na = await authSession();
  const fromNa = sessionFromNextAuth(na);
  if (fromNa) return fromNa;
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return getSession(secret);
}

export async function requireAuth(): Promise<
  { ok: true; session: JwtPayload } | { ok: false; response: NextResponse }
> {
  const na = await authSession();
  const fromNa = sessionFromNextAuth(na);
  if (fromNa) return { ok: true, session: fromNa };
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  const session = await getSession(secret);
  if (!session) return { ok: false, response: jsonError("Unauthorized", 401) };
  return { ok: true, session };
}

export async function requireAdmin(): Promise<
  { ok: true; session: JwtPayload } | { ok: false; response: NextResponse }
> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");

  const jwtSession = await getSession(secret);
  if (jwtSession?.role === "admin") {
    return { ok: true, session: jwtSession };
  }

  const na = await authSession();
  const fromNa = sessionFromNextAuth(na);
  if (fromNa?.role === "admin") {
    return { ok: true, session: fromNa };
  }

  if (!jwtSession && !fromNa) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }
  return { ok: false, response: jsonError("Forbidden", 403) };
}
