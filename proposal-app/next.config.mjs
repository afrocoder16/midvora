import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app sits inside the Astro repo (two lockfiles). Pin the tracing root to
  // this folder so Next doesn't infer the parent directory.
  outputFileTracingRoot: __dirname,
  // @react-pdf/renderer pulls in some node-flavored deps; keep it server-external
  // so it isn't bundled into the client.
  serverExternalPackages: ["@react-pdf/renderer"],
  async headers() {
    // Security baseline headers applied to every route. HTTPS is enforced by
    // Vercel at the platform level; HSTS reinforces it for browsers.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Custom proposals and uploaded PDFs are previewed in same-origin
          // iframes on the client signing page.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
