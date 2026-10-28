import { expect, test, type Page } from "@playwright/test";
import { masukSebagaiSuperadmin } from "./masuk";

// Admin mengatur soal tes minat bakat (PRD 1.3 butir 80): tambah, tampil di halaman publik, geser, sembunyikan, ubah, hapus.
const AWALAN = "Uji e2e soal";

async function bersihkan(page: Page) {
  const res = await page.request.get("/api/v1/admin/soal-minat?per=100");
  if (!res.ok()) return;
  const { data } = (await res.json()) as { data: { id: string; teks: string }[] };
  for (const s of data.filter((x) => x.teks.startsWith(AWALAN))) await page.request.delete(`/api/v1/admin/soal-minat/${s.id}`, { headers: { "sec-fetch-site": "same-origin" } });
}

test.describe("admin: soal tes minat bakat", () => {
  test.beforeEach(async ({ page }) => {
    await masukSebagaiSuperadmin(page);
    await bersihkan(page);
  });
  test.afterEach(async ({ page }) => {
    await bersihkan(page);
  });

  test("tambah soal tampil di tes publik, bisa digeser, disembunyikan, diubah, dan dihapus", async ({ page }) => {
    const teks = `${AWALAN} ${Date.now()}`;
    await page.goto("/admin/tes-minat-bakat");
    await expect(page.getByRole("heading", { name: "Tes Minat Bakat", level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "Tambah soal" }).first().click();
    await page.getByLabel(/Teks soal/).fill(teks);
    await page.getByLabel(/Pilihan A/).fill("Jawaban untuk MPLB");
    await page.getByLabel(/Pilihan B/).fill("Jawaban untuk AKL");
    await page.getByLabel(/Pilihan C/).fill("Jawaban untuk LPK3");
    await page.getByLabel(/Pilihan D/).fill("Jawaban untuk TKR");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(teks)).toBeVisible();

    // Soal baru ada di urutan terakhir (nomor 16) dan tes publik kini 16 pertanyaan.
    await page.goto("/tes-minat-bakat");
    await expect(page.getByText("Pertanyaan 1 dari 16")).toBeVisible();

    // Sembunyikan: kembali 15.
    await page.goto("/admin/tes-minat-bakat");
    await page.getByRole("button", { name: "Sembunyikan soal 16" }).click();
    await expect(page.getByText("Disembunyikan")).toBeVisible();
    await page.goto("/tes-minat-bakat");
    await expect(page.getByText("Pertanyaan 1 dari 15")).toBeVisible();

    // Ubah teks lalu hapus.
    await page.goto("/admin/tes-minat-bakat");
    await page.getByRole("button", { name: "Ubah soal 16" }).click();
    await page.getByLabel(/Teks soal/).fill(`${teks} diubah`);
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(`${teks} diubah`)).toBeVisible();
    await page.getByRole("button", { name: "Hapus soal 16" }).click();
    await page.getByRole("button", { name: "Hapus", exact: true }).click();
    await expect(page.getByText(`${teks} diubah`)).toHaveCount(0);
  });

  test("soal baru bisa langsung ditaruh di nomor pilihan admin", async ({ page }) => {
    const teks = `${AWALAN} nomor satu ${Date.now()}`;
    await page.goto("/admin/tes-minat-bakat");
    await page.getByRole("button", { name: "Tambah soal" }).first().click();
    await page.getByLabel(/Teks soal/).fill(teks);
    for (const huruf of ["A", "B", "C", "D"]) await page.getByLabel(new RegExp(`Pilihan ${huruf}`)).fill(`Jawaban ${huruf} untuk uji`);
    await page.getByLabel("Tampil di nomor").fill("1");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.locator("ol > li").first().locator("p.font-bold")).toHaveText(teks);
  });

  test("geser soal naik mengubah urutan", async ({ page }) => {
    await page.goto("/admin/tes-minat-bakat");
    const pertama = await page.locator("ol > li").nth(1).locator("p.font-bold").innerText();
    await page.getByRole("button", { name: "Naikkan soal 2" }).click();
    await expect(page.locator("ol > li").first().locator("p.font-bold")).toHaveText(pertama);
    await page.getByRole("button", { name: "Turunkan soal 1", exact: true }).click();
  });

  test("validasi: soal dengan pilihan kosong ditolak dan menampilkan galat", async ({ page }) => {
    await page.goto("/admin/tes-minat-bakat");
    await page.getByRole("button", { name: "Tambah soal" }).first().click();
    await page.getByLabel(/Teks soal/).fill(`${AWALAN} tidak lengkap`);
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Periksa isian" })).toBeVisible();
  });
});
