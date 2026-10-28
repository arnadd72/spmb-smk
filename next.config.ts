import type { NextConfig } from "next";

// cacheComponents dan partialPrefetching dimatikan (PRD v4, keputusan transisi): halaman admin dan
// wizard membaca cookie dan database di setiap request, dan mode tersebut mewajibkan <Suspense>
// di semua akses data dinamis. Aktifkan lagi hanya bila ada alasan performa yang terukur.
// Gambar konten publik dari bucket Supabase dioptimasi next/image; host diambil dari env supaya tidak di-hardcode.
const hostSupabase = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // Hanya untuk paket hosting cPanel (workflow rilis-hosting): hasil build mandiri yang dijalankan `node server.js`.
  // Tanpa variabel ini (Vercel, dev, tes) keluarannya tidak berubah.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  // Dipakai tes e2e (playwright.config.ts) agar servernya tidak berbenturan dengan `npm run dev` di folder .next.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  images: hostSupabase ? { remotePatterns: [{ protocol: "https", hostname: hostSupabase, pathname: "/storage/v1/object/public/**" }] } : undefined,
  // Logo untuk PDF formulir dibaca lewat fs saat runtime: pastikan ikut terbawa ke fungsi serverless Vercel.
  outputFileTracingIncludes: Object.fromEntries(
    ["/api/v1/pendaftar/[token]/formulir", "/api/v1/admin/peserta/[id]/formulir", "/api/v1/edit-formulir/formulir"].map((rute) => [
      rute,
      ["./src/server/services/pdf/logo-nu.png", "./public/images/sekolah/logo-sekolah.png"],
    ]),
  ),
  // Hanya berlaku di `next dev`: izinkan akses lewat terowongan ngrok untuk uji bersama teman. Tanpa ini
  // aset dev (/_next/...) diblokir dari origin selain localhost, sehingga JS klien (GSAP, Lenis) tidak jalan.
  // Build produksi tidak membutuhkannya.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app", "*.ngrok.dev", "*.ngrok.io"],
  // Model dan runtime WASM OCR jarang berubah dan berukuran besar: biarkan browser menyimpannya seminggu.
  async headers() {
    return [{ source: "/ocr/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] }];
  },
  turbopack: {
    // OCR di browser (PRD v4 11.2): pakai build WASM onnxruntime-web (sekitar 14 MB), bukan build WebGPU (28 MB) yang
    // dipilih secara bawaan. Berkas runtime-nya disalin ke public/ocr/ort oleh scripts/salin-wasm-ocr.mjs.
    resolveAlias: { "onnxruntime-web": "onnxruntime-web/wasm" },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
