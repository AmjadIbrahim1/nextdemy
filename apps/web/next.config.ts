import path from "node:path";
import type { NextConfig } from "next";

const apiUrl = (process.env.API_URL ?? "http://localhost:5000").replace(
  /\/$/,
  ""
);

const nextConfig: NextConfig = {
  // Vercel manages the Next.js server output itself; standalone is only needed
  // when the web app is packaged for a self-hosted runtime.
  output: process.env.VERCEL ? undefined : "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  reactCompiler: true,
  experimental: {
    optimizeCss: true,
    browserDebugInfoInTerminal: true,
  },
  images: {
    minimumCacheTTL: 3_153_600,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    // Same-origin proxy: the browser talks to the Next.js domain, so the
    // httpOnly refresh cookie stays first-party and works in Safari.
    return [
      {
        source: "/api/v2/:path*",
        destination: `${apiUrl}/api/v2/:path*`,
      },
    ];
  },
};

export default nextConfig;
