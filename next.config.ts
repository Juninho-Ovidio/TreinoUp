import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Há outro package-lock.json na pasta do usuário; sem isto o Next varre a pasta errada (lento).
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.openfoodfacts.org" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // TreinoUp Run publicado em /app (app Expo exportado para public/app no build).
  // Qualquer rota do app que não seja um arquivo cai no index.html dele (o roteador do app resolve).
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        { source: "/app", destination: "/app/index.html" },
        { source: "/app/:path*", destination: "/app/index.html" },
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
