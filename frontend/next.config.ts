import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/explication-prix",
        destination: "/about",
        permanent: true,
      },
      {
        source: "/a-propos",
        destination: "/about",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
