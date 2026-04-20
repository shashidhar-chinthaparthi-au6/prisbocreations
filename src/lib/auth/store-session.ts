import type { Session } from "next-auth";
import { auth } from "@/auth";
import { getSession } from "@/lib/auth/session";
import type { JwtPayload } from "@/lib/auth/jwt";

/** Storefront + shared pages: NextAuth session first, then legacy JWT cookie (admin / tooling). */
export async function getStoreSession(): Promise<JwtPayload | null> {
  const na = (await auth()) as Session | null;
  const id = na?.user?.id;
  if (id) {
    const roleRaw = (na.user as { role?: string }).role;
    const role: JwtPayload["role"] = roleRaw === "admin" ? "admin" : "customer";
    return {
      sub: id,
      email: na.user?.email ?? "",
      role,
    };
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return getSession(secret);
}
