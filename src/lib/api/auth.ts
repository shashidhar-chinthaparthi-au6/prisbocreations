import type { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { JwtPayload } from "@/lib/auth/jwt";
import { jsonError } from "./response";

/** Returns the current user session, or null if not signed in. */
export async function getOptionalAuth(): Promise<JwtPayload | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return getSession(secret);
}

export async function requireAuth(): Promise<
  { ok: true; session: JwtPayload } | { ok: false; response: NextResponse }
> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  const session = await getSession(secret);
  if (!session) return { ok: false, response: jsonError("Unauthorized", 401) };
  return { ok: true, session };
}

export async function requireAdmin(): Promise<
  { ok: true; session: JwtPayload } | { ok: false; response: NextResponse }
> {
  const r = await requireAuth();
  if (!r.ok) return r;
  if (r.session.role !== "admin") {
    return { ok: false, response: jsonError("Forbidden", 403) };
  }
  return { ok: true, session: r.session };
}
