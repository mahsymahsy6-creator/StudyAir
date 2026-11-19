import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  async rewrites() {
    return [
      {
        source: "/app/assets/:path*",
        destination: "/assets/:path*",
      },
      {
        source: "/app",
        destination: "/app.html",
      },
      {
        source: "/app/:path*",
        destination: "/app.html",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dl",
        destination: "/download",
        permanent: false,
      },
      {
        source: "/apk",
        destination:
          "https://github.com/mahsymahsy6-creator/StudyAir/releases/download/v2.0.1/StudyAir-v2.0.1.apk",
        permanent: false,
      },
      {
        source: "/StudyAir-v2.0.1.apk",
        destination:
          "https://github.com/mahsymahsy6-creator/StudyAir/releases/download/v2.0.1/StudyAir-v2.0.1.apk",
        permanent: false,
      },
      {
        source: "/StudyAir-v2.0.0.apk",
        destination:
          "https://github.com/mahsymahsy6-creator/StudyAir/releases/download/v2.0.1/StudyAir-v2.0.1.apk",
        permanent: false,
      },
      // Harmonize legacy v1 routes to authentic StudyAir v2 Web App
      {
        source: "/calendar",
        destination: "/app",
        permanent: false,
      },
      {
        source: "/dashboard",
        destination: "/app",
        permanent: false,
      },
      {
        source: "/subjects",
        destination: "/app",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
