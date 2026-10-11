import type { NextConfig } from "next";

// cacheComponents dan partialPrefetching dimatikan (PRD v4, keputusan transisi): halaman admin dan
// wizard membaca cookie dan database di setiap request, dan mode tersebut mewajibkan <Suspense>
// di semua akses data dinamis. Aktifkan lagi hanya bila ada alasan performa yang terukur.
const nextConfig: NextConfig = {
  // PDF template formulir dibaca lewat fs saat runtime: pastikan ikut terbawa ke fungsi serverless Vercel.
  outputFileTracingIncludes: {
    "/api/v1/pendaftar/[token]/formulir": ["./src/server/services/pdf/template-dasar.pdf"],
  },
  // Hanya berlaku di `next dev`: izinkan akses lewat terowongan ngrok untuk uji bersama teman. Tanpa ini
  // aset dev (/_next/...) diblokir dari origin selain localhost, sehingga JS klien (GSAP, Lenis) tidak jalan.
  // Build produksi tidak membutuhkannya.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app", "*.ngrok.dev", "*.ngrok.io"],
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
