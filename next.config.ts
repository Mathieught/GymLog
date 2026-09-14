import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/", destination: "/history", permanent: false }];
  },
};

export default withSerwist(nextConfig);
