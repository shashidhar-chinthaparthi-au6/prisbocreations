import type { NextConfig } from "next";

/** Expose Shiprocket defaults to the admin product wizard (client bundle). */
const shiprocketPublicDefaults = {
  NEXT_PUBLIC_SHIPROCKET_DEFAULT_WEIGHT_KG:
    process.env.SHIPROCKET_DEFAULT_WEIGHT_KG ??
    process.env.NEXT_PUBLIC_SHIPROCKET_DEFAULT_WEIGHT_KG ??
    "0.3",
  NEXT_PUBLIC_SHIPROCKET_DEFAULT_LENGTH_CM:
    process.env.SHIPROCKET_DEFAULT_LENGTH_CM ??
    process.env.NEXT_PUBLIC_SHIPROCKET_DEFAULT_LENGTH_CM ??
    "20",
  NEXT_PUBLIC_SHIPROCKET_DEFAULT_BREADTH_CM:
    process.env.SHIPROCKET_DEFAULT_BREADTH_CM ??
    process.env.NEXT_PUBLIC_SHIPROCKET_DEFAULT_BREADTH_CM ??
    "15",
  NEXT_PUBLIC_SHIPROCKET_DEFAULT_HEIGHT_CM:
    process.env.SHIPROCKET_DEFAULT_HEIGHT_CM ??
    process.env.NEXT_PUBLIC_SHIPROCKET_DEFAULT_HEIGHT_CM ??
    "5",
} as const;

const nextConfig: NextConfig = {
  env: { ...shiprocketPublicDefaults },
  serverExternalPackages: ["sharp"],
  async redirects() {
    return [
      { source: "/product/:slug", destination: "/products/:slug", permanent: true },
      { source: "/privacy", destination: "/pages/privacy", permanent: true },
      { source: "/returns", destination: "/pages/returns", permanent: true },
      { source: "/shipping", destination: "/pages/shipping", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/favicon.ico", destination: "/favicon.svg" },
      // Do not rewrite `/api/auth/*` → v1: NextAuth uses `/api/auth/session`, `[...nextauth]`, etc.
      // Legacy JWT routes remain at `/api/v1/auth/*`.
      { source: "/api/orders", destination: "/api/v1/orders" },
      { source: "/api/orders/:path*", destination: "/api/v1/orders/:path*" },
      { source: "/api/admin/orders/:path*", destination: "/api/v1/admin/orders/:path*" },
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
