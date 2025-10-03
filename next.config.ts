import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure proper handling of API routes and static files
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
