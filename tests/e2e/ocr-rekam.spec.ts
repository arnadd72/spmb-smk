import "dotenv/config";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { nisnUnik } from "./masuk";

// Alat ukur akurasi OCR (bukan tes biasa): unggah setiap foto contoh di docs/ocr/{akta,kk} ke wizard, jalankan mesin
// PaddleOCR sungguhan di browser, lalu simpan hasil baca mentah dari Web Worker ke docs/ocr/_mentah/. Foto dan hasilnya
// berisi data pribadi asli, jadi folder itu tidak di-commit. Hanya jalan dengan OCR_REKAM=1:
//   OCR_REKAM=1 npx playwright test tests/e2e/ocr-rekam.spec.ts --workers=1

const AKAR = path.join(__dirname, "..", "..", "docs", "ocr");
const GAMBAR = /\.(jpe?g|png|webp)$/i;
const daftar = (jenis: "akta" | "kk") => {
  try {
    return readdirSync(path.join(AKAR, jenis)).filter((f) => GAMBAR.test(f)).map((f) => ({ jenis, f }));
  } catch {
    return [];
  }
};

test.skip(!process.env.OCR_REKAM, "Alat ukur OCR: jalankan dengan OCR_REKAM=1.");
test.describe.configure({ mode: "serial" });

async function keLangkah2(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/daftar");
  await page.getByRole("button", { name: "Mulai mendaftar" }).click();
  await page.getByLabel("Nama lengkap").fill("Uji Rekam OCR");
  await page.getByLabel("NISN").fill(nisnUnik());
  await page.getByLabel("Tanggal lahir").fill("2010-01-01");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Simpan dan lanjut" }).click();
  await expect(page).toHaveURL(/\/langkah\/2$/);
}

for (const { jenis, f } of [...daftar("akta"), ...daftar("kk")]) {
  test(`rekam ${jenis}/${f}`, async ({ page }) => {
    test.setTimeout(180_000);
    // Sadap pesan "hasil" dari Web Worker OCR tanpa mengubah kode aplikasi.
    await page.addInitScript(() => {
      const Asli = window.Worker;
      (window as unknown as { __rekam: unknown[] }).__rekam = [];
      window.Worker = class extends Asli {
        constructor(url: string | URL, opsi?: WorkerOptions) {
          super(url, opsi);
          this.addEventListener("message", (e: MessageEvent) => {
            if ((e.data as { tipe?: string })?.tipe === "hasil") (window as unknown as { __rekam: unknown[] }).__rekam.push(e.data);
          });
        }
      };
    });
    await keLangkah2(page);
    await page.locator(`[data-berkas=${jenis}]`).setInputFiles(path.join(AKAR, jenis, f));
    await expect.poll(() => page.evaluate(() => (window as unknown as { __rekam: unknown[] }).__rekam.length), { timeout: 150_000 }).toBe(1);
    const hasil = await page.evaluate(() => (window as unknown as { __rekam: unknown[] }).__rekam[0]);
    const tujuan = path.join(AKAR, process.env.OCR_REKAM_KE || "_mentah", jenis);
    mkdirSync(tujuan, { recursive: true });
    writeFileSync(path.join(tujuan, `${f}.json`), JSON.stringify(hasil, null, 1));
  });
}
