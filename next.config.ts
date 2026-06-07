import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: resolve(import.meta.dirname),
  },
  serverExternalPackages: ["pg", "yahoo-finance2"],
  experimental: {
    // Client Router Cache: keep visited dynamic pages (those gated by
    // requireSession) fresh in the browser for 2 min, so returning to a
    // section is instant with no server roundtrip. User mutations already
    // call revalidatePath/router.refresh, so only market prices can lag,
    // and those are bounded by the server-side Yahoo cache anyway.
    staleTimes: {
      dynamic: 120,
      static: 300,
    },
  },
};

export default nextConfig;
