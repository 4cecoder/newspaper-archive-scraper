import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site is deployed as a fully static export (GitHub Pages, no server).
  output: "export",
  // CI publishes under /newspaper-archive-scraper — pass NEXT_PUBLIC_BASE_PATH.
  // Local builds default to serving from the root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  // web/ is a standalone app (not a workspace member), so point Turbopack at
  // this directory instead of the monorepo root it would otherwise infer.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
