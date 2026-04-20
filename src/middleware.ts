import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthJsSecret } from "@/lib/auth/auth-secret";

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

  const token = await getToken({ req, secret });
  if (path.startsWith("/account") && !token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*"],
};
