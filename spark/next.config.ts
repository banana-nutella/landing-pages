import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (the built-in demo database) ships a WASM file; keep it out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
