import "dotenv/config";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

// Alur wizard pendaftaran lengkap secara manual (tanpa OCR) di layar HP, lalu cek status.
// Data uji memakai nama "Uji E2E Wizard" dan dibersihkan setelahnya.
const NAMA = "Uji E2E Wizard";
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);

async function axe(page: Page) {
  await page.waitForTimeout(500); // tunggu transisi masuk selesai (opacity sementara memengaruhi kontras)
  const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`), "pelanggaran aksesibilitas").toEqual([]);
}

const lanjut = (page: Page) => page.getByRole("button", { name: "Simpan dan lanjut" }).click();

/** Isi semua field langkah aktif dengan nilai valid, berdasarkan nama field. */
async function isiFormLangkah(page: Page) {
  const nilaiNama: Record<string, string> = {
    nik: "3302010101010001",
    no_kk: "3302010101010002",
    anak_ke: "2",
    jumlah_saudara: "3",
    tinggi_badan: "160",
    berat_badan: "50",
    no_hp: "081234567890",
    no_wa: "081234567891",
    no_hp_ortu: "081298765432",
    email: "uji@contoh.id",
  };
  for (const el of await page.locator("input[name]:not([type=radio]):not([type=hidden]):not([disabled])").all()) {
    const nama = (await el.getAttribute("name")) ?? "";
    await el.fill(nilaiNama[nama] ?? "Contoh");
  }
  for (const grup of await page.locator("fieldset:has(input[type=radio])").all()) await grup.locator("input[type=radio]").first().check();
  const kotak = page.getByRole("combobox");
  for (let i = 0; i < (await kotak.count()); i++) {
    await kotak.nth(i).click();
    await page.getByRole("option").first().click();
  }
}

test.describe("wizard pendaftaran manual", () => {
  test.afterAll(async () => {
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    await db.query('DELETE FROM "Pendaftar" WHERE "namaLengkap" = $1', [NAMA]);
    await db.query('DELETE FROM "PendaftaranDraft" WHERE "submittedAt" IS NOT NULL');
    await db.end();
  });

  test("langkah tanpa draf diarahkan ke halaman mulai", async ({ page }) => {
    await page.goto("/daftar/langkah/5");
    await expect(page).toHaveURL(/\/daftar$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Pendaftaran peserta didik baru");
  });

  test("dari mulai sampai nomor pendaftaran dan cek status", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/daftar");
    await axe(page);
    await page.getByRole("button", { name: "Mulai mendaftar" }).click();
    await expect(page).toHaveURL(/\/daftar\/langkah\/1$/);

    // Gerbang: langkah 5 belum boleh dibuka
    await page.goto("/daftar/langkah/5");
    await expect(page).toHaveURL(/\/daftar\/langkah\/1$/);

    // Langkah 1: validasi inline lalu isi
    await lanjut(page);
    await expect(page.getByRole("alert").filter({ hasText: "wajib diisi" }).first()).toBeVisible();
    await page.getByLabel("Nama lengkap").fill(NAMA);
    await page.getByLabel("NISN").fill("12345");
    await page.getByLabel("Tanggal lahir").fill("2011-05-17");
    await page.getByRole("checkbox").check();
    await lanjut(page);
    await expect(page.getByText("NISN harus 10 digit angka.")).toBeVisible();
    await page.getByLabel("NISN").fill("1234567890");
    await axe(page);
    await lanjut(page);

    // Langkah 2: unggah akta
    await expect(page).toHaveURL(/\/langkah\/2$/);
    await page.locator("[data-berkas=akta]").setInputFiles({ name: "akta.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("terunggah")).toBeVisible();
    await axe(page);
    await lanjut(page);

    // Langkah 3: rapor wajib, tabel nilai
    await expect(page).toHaveURL(/\/langkah\/3$/);
    await lanjut(page);
    await expect(page.getByText("Unggah berkas rapor terlebih dahulu.")).toBeVisible();
    await page.locator("[data-berkas=rapor]").setInputFiles({ name: "rapor.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("terunggah")).toBeVisible();
    for (const sel of await page.locator("input[aria-label$='semester 1']").all()) await sel.fill("82");
    await axe(page);
    await lanjut(page);

    // Langkah 4: rekomendasi
    await expect(page).toHaveURL(/\/langkah\/4$/);
    await expect(page.getByText("Paling Sesuai").first()).toBeVisible();
    await axe(page);
    await lanjut(page);

    // Langkah 5, 6, 7
    for (const n of [5, 6, 7]) {
      await expect(page).toHaveURL(new RegExp(`/langkah/${n}$`));
      await isiFormLangkah(page);
      if (n === 7) {
        for (const kotak of await page.getByRole("group", { name: /Nilai ujian/ }).locator("input").all()) await kotak.fill("80");
      }
      if (n === 5) await axe(page);
      await lanjut(page);
    }

    // Langkah 8: tinjau dan kirim
    await expect(page).toHaveURL(/\/langkah\/8$/);
    await expect(page.getByText(NAMA)).toBeVisible();
    await axe(page);
    await page.getByRole("button", { name: "Kirim pendaftaran" }).click();
    await expect(page.getByText("Centang pernyataan")).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Kirim pendaftaran" }).click();

    await expect(page).toHaveURL(/\/daftar\/sukses\//);
    const nomor = (await page.locator("[data-nomor]").innerText()).trim();
    expect(nomor).toMatch(/^SPMB-\d{4}-\d{4}$/);
    await axe(page);

    // PDF formulir dapat diunduh dari halaman sukses
    const tautan = await page.getByRole("link", { name: "Unduh formulir (PDF)" }).getAttribute("href");
    const res = await page.request.get(tautan!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["content-disposition"]).toContain(`Formulir-${nomor}.pdf`);
    expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
    expect((await page.request.get("/api/v1/pendaftar/tokensalah1234567890tokensalah1234567890/formulir")).status()).toBe(404);

    // Cookie draf sudah dihapus: langkah tidak bisa dibuka lagi
    await page.goto("/daftar/langkah/3");
    await expect(page).toHaveURL(/\/daftar$/);

    // Cek status
    await page.goto("/cek-status");
    await page.getByLabel("Nomor pendaftaran").fill(nomor);
    await page.getByLabel("Tanggal lahir").fill("2011-05-18");
    await page.getByRole("button", { name: "Cek status" }).click();
    await expect(page.getByText("Nomor pendaftaran atau tanggal lahir tidak cocok.")).toBeVisible();
    await page.getByLabel("Tanggal lahir").fill("2011-05-17");
    await page.getByRole("button", { name: "Cek status" }).click();
    await expect(page.getByText("Menunggu verifikasi")).toBeVisible();
    await expect(page.getByText(NAMA)).toBeVisible();
    await axe(page);
  });
});
