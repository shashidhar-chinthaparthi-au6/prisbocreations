import { jwtVerify } from "jose/jwt/verify";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthJsSecret } from "@/lib/auth/auth-secret";
import { getSessionJwtFromNextRequest } from "@/lib/auth/middleware-session";

export async function middleware(req: NextRequest) {
  const secret = getAuthJsSecret();
  const path = req.nextUrl.pathname;
  if (!secret) {
    if (path.startsWith("/account")) {
      const url = new URL("/login", req.url);
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let loggedIn = false;
  const sessionJwt = getSessionJwtFromNextRequest(req);
  if (sessionJwt) {
    try {
      await jwtVerify(sessionJwt, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
      loggedIn = true;
    } catch {
      loggedIn = false;
    }
  }

  if (path.startsWith("/account") && !loggedIn) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*"],
};
