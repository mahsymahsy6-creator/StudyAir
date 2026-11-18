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
    ];
  },
};

export default nextConfig;
