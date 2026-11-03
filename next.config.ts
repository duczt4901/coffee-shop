import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  ...(process.env.NODE_ENV === "development" ? {
    async rewrites() {
      return [{ source: "/api/:path*", destination: "http://127.0.0.1:8787/api/:path*" }];
    },
  } : {}),
};

export default nextConfig;
