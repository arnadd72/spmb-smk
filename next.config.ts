import type { NextConfig } from "next";

// cacheComponents dan partialPrefetching dimatikan (PRD v4, keputusan transisi): halaman admin dan
// wizard membaca cookie dan database di setiap request, dan mode tersebut mewajibkan <Suspense>
// di semua akses data dinamis. Aktifkan lagi hanya bila ada alasan performa yang terukur.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
