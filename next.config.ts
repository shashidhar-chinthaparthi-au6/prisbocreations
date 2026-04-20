import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/product/:slug", destination: "/products/:slug", permanent: true }];
  },
  async rewrites() {
    return [
      { source: "/favicon.ico", destination: "/favicon.svg" },
      // Do not rewrite `/api/auth/*` → v1: NextAuth uses `/api/auth/session`, `[...nextauth]`, etc.
      // Legacy JWT routes remain at `/api/v1/auth/*`.
      { source: "/api/orders", destination: "/api/v1/orders" },
      { source: "/api/orders/:path*", destination: "/api/v1/orders/:path*" },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "plus.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "source.unsplash.com", pathname: "/**" },
      {
        protocol: "https",
        hostname: "prisbocreations.s3.us-east-1.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "prisbocreationsprod.s3.us-east-1.amazonaws.com",
        pathname: "/**",
      },
      // Virtual-hosted URLs: <bucket>.s3.us-east-1.amazonaws.com
      {
        protocol: "https",
        hostname: "*.s3.us-east-1.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
