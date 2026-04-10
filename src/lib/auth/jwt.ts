import jwt from "jsonwebtoken";

export type JwtPayload = {
  sub: string;
  email: string;
  role: "customer" | "admin";
};

export function signAccessToken(payload: JwtPayload, secret: string): string {
  return jwt.sign(
    { sub: payload.sub, email: payload.email, role: payload.role },
    secret,
    { expiresIn: "7d" }
  );
}

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  const decoded = jwt.verify(token, secret) as JwtPayload & { iat?: number; exp?: number };
  return { sub: decoded.sub, email: decoded.email, role: decoded.role };
}
