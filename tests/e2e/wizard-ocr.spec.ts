import "dotenv/config";
import { createHash } from "node:crypto";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";
import { nisnUnik } from "./masuk";

// OCR di browser (PRD v4 Bagian 11). Hasil baca dipalsukan lewat window.__SPMB_OCR_PALSU__ agar alur deterministik;
// satu uji terakhir memakai mesin PaddleOCR sungguhan pada foto KK sintetis. Data uji memakai nama "Uji E2E OCR".
const NAMA = "Uji E2E OCR";
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);

const baris = (teks: string, y: number, x = 0, lebar = 600) => ({ teks, kotak: [x, y, x + lebar, y + 30] as [number, number, number, number], skor: 0.96 });

const KK_PALSU = [
  "KARTU KELUARGA",
  "No. 3301010406080001",
  "Nama Kepala Keluarga : SUTARNO Kecamatan KEDUNGREJA",
  "Alamat : DUSUN SIDAURIP Kabupaten/Kota : CILACAP",
  "RT/RW : 003/004 Kode Pos 53263",
  "Kelurahan/Desa : SIDANEGARA Provinsi JAWA TENGAH",
  "1 SUTARNO 3301012204780001 LAKI-LAKI CILACAP 22-04-1978",
  "2 LISA TRI SAPARININGRUM 3301018611830003 PEREMPUAN CILACAP 28-11-1983",
  `3 ${NAMA.toUpperCase()} 3301010903110002 LAKI-LAKI CILACAP 09-03-2011`,
].map((t, i) => baris(t, i * 40));

/** Pasang mesin OCR palsu sebelum halaman dimuat: kembalikan hasil tetap, atau gagal bila `gagal` true. */
async function palsukanOcr(page: Page, perJenis: { kk?: unknown[]; gagal?: boolean }) {
  await page.addInitScript(
    ({ kk, gagal }) => {
      (window as unknown as { __SPMB_OCR_PALSU__: (f: File) => Promise<unknown> }).__SPMB_OCR_PALSU__ = async () => {
        await new Promise((r) => setTimeout(r, 150));
        if (gagal) throw new Error("palsu: gagal");
        return { baris: kk, lebar: 1000, tinggi: 800, sudut: 0, durasiMs: 1200 };
      };
    },
    { kk: perJenis.kk ?? [], gagal: perJenis.gagal ?? false },
  );
}

async function axe(page: Page) {
  await page.waitForTimeout(500);
  const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`), "pelanggaran aksesibilitas").toEqual([]);
}

const lanjut = (page: Page) => page.getByRole("button", { name: "Simpan dan lanjut" }).click();

/** Akta wajib sejak commit 9ca8344; diunggah sesudah KK agar pemeriksaan hasil baca KK tidak terganggu. */
async function unggahAkta(page: Page) {
  await page.locator("[data-berkas=akta]").setInputFiles({ name: "akta.png", mimeType: "image/png", buffer: PNG });
  await expect(page.locator("[data-berkas=akta]")).toHaveCount(1);
  await page.waitForTimeout(1500);
}

async function mulaiSampaiLangkah2(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/daftar");
  await page.getByRole("button", { name: "Mulai mendaftar" }).click();
  await page.getByLabel("Nama lengkap").fill(NAMA);
  await page.getByLabel("NISN").fill(nisnUnik());
  await page.getByLabel("Tanggal lahir").fill("2011-03-09");
  await page.getByRole("checkbox").check();
  await lanjut(page);
  await expect(page).toHaveURL(/\/langkah\/2$/);
}

/** Buka lebih awal langkah 5 dengan mengubah penanda kemajuan draf di database (menghindari mengisi langkah 3 dan 4). */
async function bukaGerbangLangkah(page: Page, langkah: number) {
  const token = (await page.context().cookies()).find((c) => c.name === "spmb_draft")?.value;
  expect(token).toBeTruthy();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query('UPDATE "PendaftaranDraft" SET "langkahTerakhir" = $1 WHERE "tokenHash" = $2', [langkah, createHash("sha256").update(token!).digest("hex")]);
  await db.end();
}

test.describe("OCR di wizard", () => {
  test.afterEach(async ({ page }) => {
    const token = (await page.context().cookies()).find((c) => c.name === "spmb_draft")?.value;
    if (!token) return;
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    const hash = createHash("sha256").update(token).digest("hex");
    await db.query('DELETE FROM "OcrHasil" WHERE "draftId" IN (SELECT id FROM "PendaftaranDraft" WHERE "tokenHash" = $1)', [hash]);
    await db.query('DELETE FROM "PendaftaranDraft" WHERE "tokenHash" = $1', [hash]);
    await db.end();
  });

  test("KK terbaca mengisi kartu hasil, bisa diedit, lalu mengisi langkah 5 dengan tanda dari dokumen", async ({ page }) => {
    test.setTimeout(120_000);
    await palsukanOcr(page, { kk: KK_PALSU });
    await mulaiSampaiLangkah2(page);

    await page.locator("[data-berkas=kk]").setInputFiles({ name: "kk.png", mimeType: "image/png", buffer: PNG });
    const kartu = page.getByRole("region", { name: "Hasil baca Kartu Keluarga" });
    await expect(kartu).toBeVisible();
    await expect(kartu.getByLabel("NIK calon siswa")).toHaveValue("3301010903110002");
    await expect(kartu.getByLabel("Nomor Kartu Keluarga")).toHaveValue("3301010406080001");
    await expect(kartu.getByLabel("Alamat")).toHaveValue("DUSUN SIDAURIP");
    await expect(kartu.getByLabel("Kecamatan")).toHaveValue("KEDUNGREJA");
    await axe(page);

    // Pendaftar mengoreksi alamat
    await kartu.getByLabel("Alamat").fill("dusun sidaurip kulon");
    await expect(kartu.getByLabel("Alamat")).toHaveValue("DUSUN SIDAURIP KULON");
    await unggahAkta(page);
    await lanjut(page);
    await expect(page).toHaveURL(/\/langkah\/3$/);

    // Kembali ke langkah 2: saran tersimpan di draf
    await page.goto("/daftar/langkah/2");
    await expect(page.getByRole("region", { name: "Hasil baca Kartu Keluarga" }).getByLabel("Alamat")).toHaveValue("DUSUN SIDAURIP KULON");

    // Langkah 5 terisi dari dokumen dan diberi tanda
    await bukaGerbangLangkah(page, 5);
    await page.goto("/daftar/langkah/5");
    await expect(page.locator("input[name=nik]")).toHaveValue("3301010903110002");
    await expect(page.locator("input[name=no_kk]")).toHaveValue("3301010406080001");
    await expect(page.locator("input[name=alamat]")).toHaveValue("DUSUN SIDAURIP KULON");
    await expect(page.getByText("Dari dokumen. Periksa kembali.").first()).toBeVisible();
    // Mengubah nilai menghapus tandanya
    const jumlahTanda = await page.getByText("Dari dokumen. Periksa kembali.").count();
    await page.locator("input[name=alamat]").fill("Jl. Baru");
    await expect(page.getByText("Dari dokumen. Periksa kembali.")).toHaveCount(jumlahTanda - 1);
  });

  test("OCR gagal: pesan ramah, isi manual tetap bisa dilanjutkan", async ({ page }) => {
    test.setTimeout(120_000);
    await palsukanOcr(page, { gagal: true });
    await mulaiSampaiLangkah2(page);

    await page.locator("[data-berkas=kk]").setInputFiles({ name: "kk.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText(/tidak dapat dibaca otomatis\. Silakan isi data secara manual/)).toBeVisible();
    // Kolom kosong muncul agar siswa bisa mengisi manual di langkah ini juga.
    const kartu = page.getByRole("region", { name: "Hasil baca Kartu Keluarga" });
    await expect(kartu).toBeVisible();
    await expect(kartu.getByText(/isi data di bawah ini secara manual/)).toBeVisible();
    await expect(kartu.getByLabel("NIK calon siswa")).toHaveValue("");
    await kartu.getByLabel("Alamat").fill("dusun manual");
    await expect(kartu.getByLabel("Alamat")).toHaveValue("DUSUN MANUAL");
    await unggahAkta(page);
    await lanjut(page);
    await expect(page).toHaveURL(/\/langkah\/3$/);

    // Isian manual itu tersimpan di draf.
    await page.goto("/daftar/langkah/2");
    await expect(page.getByRole("region", { name: "Hasil baca Kartu Keluarga" }).getByLabel("Alamat")).toHaveValue("DUSUN MANUAL");
    await page.goto("/daftar/langkah/3");

    // Langkah 3 tes minat bakat (PRD 1.3 butir 65): tidak ada pemilih foto rapor; soal tersembunyi sampai pendaftar ikut tes.
    await expect(page.locator("[data-baca-rapor]")).toHaveCount(0);
    await expect(page.getByText(/Pertanyaan 1 dari 15/)).toHaveCount(0);
    await page.getByRole("radio", { name: /Ya, saya ikut tes minat bakat/ }).check();
    await expect(page.getByText(/Pertanyaan 1 dari 15/)).toBeVisible();
    await page.getByRole("radio", { name: /Mengenal mesin, kendaraan/ }).check();
    // Memilih "Tidak" menyembunyikan tes lagi.
    await page.getByRole("radio", { name: /Tidak, saya akan memilih jurusan sendiri/ }).check();
    await expect(page.getByText(/Pertanyaan 1 dari 15/)).toHaveCount(0);
    // Jawaban yang sempat dipilih tidak ikut terkirim: langkah jurusan tanpa saran.
    await lanjut(page);
    await expect(page).toHaveURL(/\/langkah\/4$/);
    await expect(page.getByText(/Anda tidak mengerjakan tes minat bakat/)).toBeVisible();
  });

  test("mesin PaddleOCR sungguhan membaca foto KK sintetis di browser", async ({ page }) => {
    test.setTimeout(180_000);
    await mulaiSampaiLangkah2(page);
    // Nama murid pada fixture berbeda: pakai nama anggota keluarga yang ada di foto.
    await page.goBack().catch(() => undefined);
    await page.goto("/daftar/langkah/1");
    await page.getByLabel("Nama lengkap").fill("Ahmad Fauzi Ramadhan");
    await lanjut(page);
    await expect(page).toHaveURL(/\/langkah\/2$/);

    await page.locator("[data-berkas=kk]").setInputFiles(path.join(__dirname, "..", "fixtures", "kk-sintetis.jpg"));
    const kartu = page.getByRole("region", { name: "Hasil baca Kartu Keluarga" });
    await expect(kartu).toBeVisible({ timeout: 120_000 });
    await expect(kartu.getByLabel("Nomor Kartu Keluarga")).toHaveValue("3301012503090001");
    await expect(kartu.getByLabel("NIK calon siswa")).toHaveValue("3301011205100002");
  });

  test("NIK dan nomor HP: peringatan langsung saat mengetik, hanya angka, dan jadi benar begitu sesuai (tanpa klik simpan)", async ({ page }) => {
    test.setTimeout(120_000);
    await palsukanOcr(page, { kk: KK_PALSU });
    await mulaiSampaiLangkah2(page);
    await page.locator("[data-berkas=kk]").setInputFiles({ name: "kk.png", mimeType: "image/png", buffer: PNG });
    const kartu = page.getByRole("region", { name: "Hasil baca Kartu Keluarga" });
    await expect(kartu).toBeVisible();

    for (const label of ["NIK calon siswa", "NIK ayah", "NIK ibu"]) {
      const kolom = kartu.getByLabel(label);
      const medan = kolom.locator("xpath=ancestor::div[contains(@class,'flex-col')][1]");
      await expect(kolom).toHaveAttribute("inputmode", "numeric");

      // Belum 16 digit: peringatan muncul langsung, kolom ditandai.
      await kolom.fill("330101");
      await expect(medan.getByText("Baru 6 dari 16 digit. NIK harus tepat 16 digit angka.")).toBeVisible();
      await expect(kolom).toHaveAttribute("aria-invalid", "true");

      // Huruf, spasi, dan tanda tidak diterima dan langsung diberi tahu; digit yang valid tetap masuk.
      await kolom.fill("33a01-01 2204");
      await expect(kolom).toHaveValue("33010122 04".replace(" ", ""));
      await expect(medan.getByText("Hanya angka yang diterima. Huruf, spasi, dan tanda dihapus.")).toBeVisible();

      // Tempelan berformat dengan spasi tetap utuh 16 digit (maxLength biasa memotongnya di 16 karakter).
      await kolom.fill("3301 0122 0478 0001");
      await expect(kolom).toHaveValue("3301012204780001");
      await expect(medan.getByText("16 digit, sudah benar.")).toBeVisible();
      await expect(kolom).not.toHaveAttribute("aria-invalid", "true");

      // Kelebihan digit dibuang dan diberi tahu.
      await kolom.fill("33010122047800019");
      await expect(kolom).toHaveValue("3301012204780001");
      await expect(medan.getByText("Maksimal 16 digit. Kelebihan digit dihapus.")).toBeVisible();
    }

    // Langkah 2 tidak bisa dilanjutkan dengan NIK yang masih kurang, dan kolom pertama yang salah mendapat fokus.
    const ayah = kartu.getByLabel("NIK ayah");
    await ayah.fill("330101220478000");
    await unggahAkta(page);
    await lanjut(page);
    await expect(page).toHaveURL(/\/langkah\/2$/);
    await expect(page.getByText(/Perbaiki dulu: NIK ayah/)).toBeVisible();
    await expect(ayah).toBeFocused();

    // Dilengkapi 16 digit: peringatan berubah menjadi benar dan lanjut.
    await ayah.fill("3301012204780001");
    await expect(kartu.getByLabel("NIK ayah").locator("xpath=ancestor::div[contains(@class,'flex-col')][1]").getByText("16 digit, sudah benar.")).toBeVisible();
    await lanjut(page);
    await expect(page).toHaveURL(/\/langkah\/3$/);

    // Nomor HP di formulir: langsung diperingatkan, hanya angka, 9 sampai 13 digit.
    await bukaGerbangLangkah(page, 5);
    await page.goto("/daftar/langkah/5");
    const hp = page.locator("input[name=no_hp]");
    const medanHp = hp.locator("xpath=ancestor::div[contains(@class,'flex-col')][1]");
    await expect(hp).toHaveAttribute("inputmode", "numeric");
    await hp.fill("0812");
    await expect(medanHp.getByText("Baru 4 digit. Nomor HP harus 9 sampai 13 digit angka.")).toBeVisible();
    await hp.fill("+62 812-3456 7890abc");
    await expect(hp).toHaveValue("6281234567890");
    await expect(medanHp.getByText("Hanya angka yang diterima. Huruf, spasi, dan tanda dihapus.")).toBeVisible();
    await expect(medanHp.getByText("13 digit, sudah benar.")).toBeVisible();
    await hp.fill("08123456789012345");
    await expect(hp).toHaveValue("0812345678901");
    await expect(medanHp.getByText("Maksimal 13 digit. Kelebihan digit dihapus.")).toBeVisible();
    await hp.fill("081234567");
    await expect(medanHp.getByText("9 digit, sudah benar.")).toBeVisible();
  });
});
