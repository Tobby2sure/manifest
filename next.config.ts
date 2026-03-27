import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Disable static generation for all pages — app uses client-side auth
  // This avoids Privy provider errors during prerender
  experimental: {
    // Force all routes to be dynamic
  },
};

export default nextConfig;
