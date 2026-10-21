import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "@playwright/test";

// Tes e2e memakai database lokal terpisah (.env.test, spmb_e2e_test di port 5433, terpisah dari spmb_test milik tes unit) dan server dev sendiri di port 3100,
// supaya tidak menyentuh Supabase dan tidak mengganggu `npm run dev` di port 3000. Siapkan sekali: `npm run db:test:siapkan`.
dotenv.config({ path: path.join(__dirname, ".env.test"), override: true, quiet: true });

// Pengaman: tes e2e membuat dan menghapus data. Tolak jalan bila database bukan Postgres lokal bernama *_test.
const urlDb = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\/[^@]+@(localhost|127\.0\.0\.1)(:\d+)?\/[^/?]+_test(\?.*)?$/.test(urlDb)) {
  throw new Error(
    "Tes e2e dihentikan: DATABASE_URL harus mengarah ke Postgres lokal dengan nama database berakhiran _test. Periksa .env.test.",
  );
}

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  // Server dev mengompilasi rute saat pertama diakses; beri ruang saat banyak berkas uji berjalan paralel.
  expect: { timeout: 15_000 },
  // Semua berkas uji berbagi satu database dan mengubah tabel global (galeri, gelombang, pengaturan), jadi berjalan satu per satu.
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}` },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next dev --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: true,
        timeout: 120_000,
        // Folder build terpisah: Next tidak mengizinkan dua server dev memakai folder .next yang sama.
        env: { ...process.env, NEXT_DIST_DIR: ".next-e2e" } as Record<string, string>,
      },
});
