import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["wc26live.org", "localhost:3000"],
    },
  },
};

export default nextConfig;
