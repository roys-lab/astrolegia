import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los packages del monorepo se consumen desde su fuente TypeScript
  // (main -> src/index.ts, igual que hace apps/admin con packages/ui vía alias
  // de Vite), así que Next tiene que transpilarlos. @astrolegia/contracts
  // viene compilado (dist) y no lo necesita.
  transpilePackages: ["@astrolegia/core", "@astrolegia/ui"],
};

export default nextConfig;
