import { expect, test, type Page } from "@playwright/test";
import { masukSebagaiSuperadmin } from "./masuk";

// Alur panitia mengelola berita: tambah, tampil di situs publik, ubah, hapus. Memakai database dev.
const AWALAN = "Uji e2e";

async function bersihkan(page: Page) {
  const res = await page.request.get(`/api/v1/admin/berita?q=${encodeURIComponent(AWALAN)}&per=50`);
  if (!res.ok()) return;
  const { data } = (await res.json()) as { data: { id: string }[] };
  for (const b of data) await page.request.delete(`/api/v1/admin/berita/${b.id}`, { headers: { "sec-fetch-site": "same-origin" } });
}

test.describe("admin: kelola berita", () => {
  test.beforeEach(async ({ page }) => {
    await masukSebagaiSuperadmin(page);
    await bersihkan(page);
  });
  test.afterEach(async ({ page }) => {
    await bersihkan(page);
  });

  test("tambah berita tampil di situs publik, bisa diubah dan dihapus", async ({ page }) => {
    const judul = `${AWALAN} pendaftaran dibuka ${Date.now()}`;

    await page.goto("/admin/berita");
    await page.getByRole("button", { name: /Tambah berita/ }).first().click();
    await page.getByLabel(/Judul/).fill(judul);
    await page.getByLabel(/Isi berita/).fill('<p>Pendaftaran resmi dibuka.</p><script>window.__xss=1</script>');
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(judul)).toBeVisible();

    // Tampil di halaman publik, dan skrip tidak lolos.
    await page.goto("/berita");
    await page.getByRole("link", { name: new RegExp(judul) }).click();
    await expect(page.getByRole("heading", { level: 1, name: judul })).toBeVisible();
    await expect(page.getByText("Pendaftaran resmi dibuka.")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();

    // Ubah.
    await page.goto("/admin/berita");
    await page.getByRole("button", { name: new RegExp(`Ubah ${judul}`) }).click();
    await page.getByLabel(/Judul/).fill(`${judul} revisi`);
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(`${judul} revisi`)).toBeVisible();

    // Hapus dengan konfirmasi.
    await page.getByRole("button", { name: new RegExp(`Hapus ${judul} revisi`) }).click();
    await expect(page.getByRole("heading", { name: /Hapus berita/ })).toBeVisible();
    await page.getByRole("button", { name: "Hapus", exact: true }).click();
    await expect(page.getByText(`${judul} revisi`)).toHaveCount(0);
  });

  test("validasi: judul kosong menampilkan galat di dekat field", async ({ page }) => {
    await page.goto("/admin/berita");
    await page.getByRole("button", { name: /Tambah berita/ }).first().click();
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Judul wajib diisi" })).toBeVisible();
  });

  test("halaman jurusan publik: kode tidak peka huruf, kode tak dikenal 404", async ({ page }) => {
    await page.goto("/jurusan/tkr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("TKR");
    expect((await page.goto("/jurusan/xyz"))?.status()).toBe(404);
  });

  test("superadmin bisa membuka halaman pengaturan", async ({ page }) => {
    await page.goto("/admin/pengaturan");
    await expect(page.getByRole("heading", { name: "Pengaturan" })).toBeVisible();
  });
});

// Soal tes minat bakat diatur admin di Isi Situs (PRD 1.3 butir 80). 15 soal bawaan migrasi tidak disentuh.
const AWALAN_SOAL = "Uji e2e soal";

async function bersihkanSoal(page: Page) {
  const res = await page.request.get(`/api/v1/admin/soal-minat?q=${encodeURIComponent(AWALAN_SOAL)}&per=50`);
  if (!res.ok()) return;
  const { data } = (await res.json()) as { data: { id: string }[] };
  for (const s of data) await page.request.delete(`/api/v1/admin/soal-minat/${s.id}`, { headers: { "sec-fetch-site": "same-origin" } });
}

test.describe("admin: kelola soal tes minat bakat", () => {
  test.beforeEach(async ({ page }) => {
    await masukSebagaiSuperadmin(page);
    await bersihkanSoal(page);
  });
  test.afterEach(async ({ page }) => {
    await bersihkanSoal(page);
  });

  test("soal baru dari menu Isi Situs tampil di tes publik dan bisa dihapus", async ({ page }) => {
    const pertanyaan = `${AWALAN_SOAL} kegiatan favorit ${Date.now()}?`;

    await page.goto("/admin");
    await page.getByRole("link", { name: /Tes Minat Bakat/ }).first().click();
    await expect(page.getByRole("heading", { name: "Soal Tes Minat Bakat" })).toBeVisible();
    await page.getByRole("button", { name: /Tambah soal/ }).first().click();
    await page.getByLabel(/^Pertanyaan/).fill(pertanyaan);
    await page.getByLabel(/Pilihan A/).fill("Menyusun arsip kelas.");
    await page.getByLabel(/Pilihan B/).fill("Mencatat uang kas.");
    await page.getByLabel(/Pilihan C/).fill("Mengenal obat herbal.");
    await page.getByLabel(/Pilihan D/).fill("Merawat sepeda motor.");
    await page.getByLabel(/Urutan/).fill("0");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(pertanyaan)).toBeVisible();

    // Urutan 0 tampil paling depan; jumlah soal ikut bertambah.
    await page.goto("/tes-minat-bakat");
    const tes = page.locator("#tes-minat-bakat");
    await expect(tes.getByText("Pertanyaan 1 dari 16")).toBeVisible();
    await expect(tes.getByRole("group", { name: pertanyaan })).toBeVisible();
    await expect(tes.getByText("Merawat sepeda motor.")).toBeVisible();

    await page.goto("/admin/tes-minat");
    await page.getByRole("button", { name: `Hapus ${pertanyaan}` }).click();
    await page.getByRole("button", { name: "Hapus", exact: true }).click();
    await expect(page.getByText(pertanyaan)).toHaveCount(0);

    await page.goto("/tes-minat-bakat");
    await expect(page.locator("#tes-minat-bakat").getByText("Pertanyaan 1 dari 15")).toBeVisible();
  });
});
