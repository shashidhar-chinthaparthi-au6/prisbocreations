import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authJwtDecode, authJwtEncode } from "@/lib/auth/auth-jwt-hs256";
import { getAuthJsSecret } from "@/lib/auth/auth-secret";

const secret = getAuthJsSecret();
if (!secret) {
  throw new Error(
    "Auth.js: set AUTH_SECRET or NEXTAUTH_SECRET in .env (or reuse JWT_SECRET). See .env.example.",
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const [{ connectDb }, { User }, bcrypt] = await Promise.all([
          import("@/lib/db"),
          import("@/lib/models/User"),
          import("bcryptjs"),
        ]);
        await connectDb();
        const email = String(credentials.email).toLowerCase().trim();
        const user = await User.findOne({ email }).lean();
        if (!user) return null;
        if (user.deletedAt) return null;
        if (user.passwordHash === "DELETED") return null;
        const valid = await bcrypt.default.compare(String(credentials.password), user.passwordHash);
        if (!valid) return null;
        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role ?? "customer",
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  jwt: {
    encode: authJwtEncode,
    decode: authJwtDecode,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "customer";
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      if (token?.role) session.user.role = token.role as string;
      return session;
    },
  },
});
