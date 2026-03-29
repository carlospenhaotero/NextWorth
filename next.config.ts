import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: resolve(import.meta.dirname),
  },
  serverExternalPackages: ["pg", "yahoo-finance2"],
};

export default nextConfig;
