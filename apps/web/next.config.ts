import type { NextConfig } from "next";

const apiOrigin = process.env.ELO_API_ORIGIN ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * Same-origin API proxy so session cookies are set on :3100
   * (avoids cross-port cookie issues between web and Nest).
   */
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
