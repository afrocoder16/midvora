import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep build tracing scoped to this app inside the multi-app repository.
  outputFileTracingRoot: __dirname,
  experimental: {
    // Allow multipart overhead while uploadAssetAction enforces a 10 MB file cap.
    serverActions: { bodySizeLimit: "11mb" },
  },
};

export default nextConfig;
