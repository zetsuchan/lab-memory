import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the project root (a stray lockfile elsewhere can confuse auto-detection).
  turbopack: { root: here },
  // Allow the dev server to be reached via 127.0.0.1 as well as localhost.
  allowedDevOrigins: ["127.0.0.1"],
  // Uploads can be a few MB of CSV/markdown; allow generous server action bodies.
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
