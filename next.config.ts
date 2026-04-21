import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
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
      /** S3 and CloudFront-style hosts (uploads, buckets, CDNs). */
      { protocol: "https", hostname: "*.amazonaws.com", pathname: "/**" },
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
      {
        protocol: "https",
        hostname: "*.s3.us-east-1.amazonaws.com",
        pathname: "/**",
      },
      /** Local `/public/uploads` via dev server */
      { protocol: "http", hostname: "localhost", pathname: "/uploads/**" },
      { protocol: "https", hostname: "localhost", pathname: "/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/uploads/**" },
      { protocol: "https", hostname: "127.0.0.1", pathname: "/uploads/**" },
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
