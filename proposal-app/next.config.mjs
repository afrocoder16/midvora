/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
