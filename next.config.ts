import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable StrictMode to prevent double-mounting in dev
  // which would trigger 2x greeting API calls simultaneously
  reactStrictMode: false,
};

export default nextConfig;
