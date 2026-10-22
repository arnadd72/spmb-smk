import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { masukSebagai } from "./masuk";

// Admin mengganti foto yang tadinya tertulis tetap di kode (logo, hero, foto jurusan, galeri bawaan) dari halaman Galeri.
// Tanpa kunci Cloudinary, unggahan e2e masuk ke disk lokal (public/uploads/konten), jadi tidak ada layanan luar yang disentuh.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const SAMA_ORIGIN = { "sec-fetch-site": "same-origin" };
const URL_UNGGAHAN = /uploads(%2F|\/)konten/;

async function pulihkan(page: Page) {
  for (const kunci of ["logo", "hero", "jurusan-AKL"]) await page.request.delete(`/api/v1/admin/aset/${kunci}`, { headers: SAMA_ORIGIN });
  const res = await page.request.get("/api/v1/admin/galeri?per=100");
  if (!res.ok()) return;
  const { data } = (await res.json()) as { data: { id: string }[] };
  for (const f of data) await page.request.delete(`/api/v1/admin/galeri/${f.id}`, { headers: SAMA_ORIGIN });
}

test.describe("admin: foto situs di halaman Galeri", () => {
  test.beforeEach(async ({ page }) => {
    await masukSebagai(page, "konten");
    await pulihkan(page);
  });
  test.afterEach(async ({ page }) => {
    await pulihkan(page);
  });

  test("halaman memuat foto tetap situs dan lolos pemeriksaan aksesibilitas", async ({ page }) => {
    await page.goto("/admin/foto-beranda");
    await expect(page.getByRole("heading", { level: 1, name: "Foto Beranda" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Foto situs" })).toBeVisible();
    for (const kunci of ["logo", "hero", "jurusan-AKL", "jurusan-MPLB", "jurusan-LPK3", "jurusan-TKR"]) {
      const kartu = page.locator(`[data-aset="${kunci}"]`);
      await expect(kartu).toBeVisible();
      await expect(kartu.getByText("Bawaan", { exact: true })).toBeVisible();
    }
    const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(hasil.violations.map((v) => v.id)).toEqual([]);
  });

  test("ganti logo tampil di navbar situs, lalu dikembalikan ke bawaan", async ({ page }) => {
    await page.goto("/admin/foto-beranda");
    const kartu = page.locator('[data-aset="logo"]');

    await kartu.locator("[data-ganti-aset=logo]").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
    await expect(kartu.getByText("Diganti", { exact: true })).toBeVisible();
    await expect(kartu.getByRole("img")).toHaveAttribute("src", URL_UNGGAHAN);

    await page.goto("/cek-status");
    await expect(page.locator("header img").first()).toHaveAttribute("src", URL_UNGGAHAN);

    await page.goto("/admin/foto-beranda");
    await page.getByRole("button", { name: /Kembalikan ke foto bawaan: Logo sekolah/ }).click();
    await expect(page.locator('[data-aset="logo"]').getByText("Bawaan", { exact: true })).toBeVisible();

    await page.goto("/cek-status");
    await expect(page.locator("header img").first()).toHaveAttribute("src", /logo-sekolah/);
  });

  test("ganti foto jurusan AKL tampil di halaman jurusan dan memakai alt yang sesuai", async ({ page }) => {
    await page.goto("/admin/foto-beranda");
    await page.locator("[data-ganti-aset=jurusan-AKL]").setInputFiles({ name: "akl.png", mimeType: "image/png", buffer: PNG });
    await expect(page.locator('[data-aset="jurusan-AKL"]').getByText("Diganti", { exact: true })).toBeVisible();

    await page.goto("/jurusan/akl");
    const foto = page.getByRole("img", { name: /Kegiatan praktik jurusan/ });
    await expect(foto).toBeVisible();
    await expect(foto).toHaveAttribute("src", URL_UNGGAHAN);

    // Jurusan lain tetap memakai foto bawaan.
    await page.goto("/jurusan/tkr");
    await expect(page.getByRole("img", { name: /Siswa TKR memeriksa roda mobil/ })).toBeVisible();
  });

  test("galeri kosong menawarkan foto bawaan; setelah dimuat bisa dikelola seperti foto lain", async ({ page }) => {
    await page.goto("/admin/galeri");
    await expect(page.getByRole("heading", { level: 1, name: "Galeri" })).toBeVisible();
    // Foto tetap situs tidak lagi di halaman Galeri (PRD 1.3 butir 61).
    await expect(page.locator("[data-aset]")).toHaveCount(0);
    await expect(page.locator("[data-galeri-bawaan]")).toBeVisible();

    await page.getByRole("button", { name: "Muat foto bawaan situs ke galeri" }).click();
    await expect(page.locator("[data-galeri-bawaan]")).toHaveCount(0);
    await expect(page.getByText("Kultum bersama di musala.")).toBeVisible();
    await expect(page.getByText("Istighotsah bersama sebelum kunjungan industri.")).toBeVisible();

    // Foto bisa dihapus seperti foto galeri lain.
    await page.getByRole("button", { name: /Hapus Kultum bersama di musala/ }).click();
    await page.getByRole("button", { name: "Hapus", exact: true }).click();
    await expect(page.getByText("Kultum bersama di musala.")).toHaveCount(0);
  });
});
