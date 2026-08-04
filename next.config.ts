import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Cursor SDK out of the webpack graph — its package includes
  // .d.ts.map files that break Next production builds when bundled.
  serverExternalPackages: ["@cursor/sdk"],
};

export default nextConfig;
