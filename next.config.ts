import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/", destination: "/history", permanent: false }];
  },
};

export default nextConfig;
