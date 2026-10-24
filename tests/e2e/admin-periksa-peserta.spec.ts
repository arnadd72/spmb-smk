import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { masukSebagai, sisipPendaftar } from "./masuk";

// Pemeriksaan berkas di halaman detail peserta. Menu Verifikasi dan keputusan status dihapus (PRD 1.3 butir 62:
// setiap pendaftar langsung diterima), begitu pula panel nilai rapor (butir 65).

async function axe(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("admin: periksa berkas di detail peserta", () => {
  test("penampil berkas di detail peserta; menu Verifikasi dan panel nilai rapor tidak ada", async ({ page }) => {
    test.setTimeout(120_000);
    const a = await sisipPendaftar(`Uji E2E Peserta Periksa ${Date.now()}`, { berkas: true });
    await masukSebagai(page, "panitia");

    await page.goto(`/admin/peserta/${a.id}`);
    await expect(page.getByRole("navigation").getByRole("link", { name: /^Verifikasi/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Verifikasi", exact: true })).toHaveCount(0);

    // Penampil: gambar dimuat lewat backend, ada penanda belum di Drive, kontrol zoom bekerja
    const gambar = page.getByRole("img", { name: /Akta kelahiran: akta\.png/ });
    await expect(gambar).toBeVisible();
    await expect.poll(() => gambar.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByText("Menunggu unggah ke Drive")).toBeVisible();
    await page.getByRole("button", { name: "Perbesar" }).click();
    await expect(gambar).toHaveCSS("transform", /matrix/);
    const unduh = await page.getByRole("link", { name: "Unduh" }).getAttribute("href");
    const res = await page.request.get(unduh!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-disposition"]).toContain("attachment");
    await axe(page);

    // Tanpa panel nilai rapor (PRD 1.3 butir 65); pilihan jurusan tetap tampil.
    await expect(page.getByRole("button", { name: "Nilai sesuai" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Nilai rapor/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Pilihan jurusan" })).toBeVisible();

    // Pembukaan berkas tercatat di riwayat
    await page.reload();
    await expect(page.getByText("Berkas dilihat").first()).toBeVisible();

    // Halaman antrean verifikasi sudah tidak ada
    const lama = await page.goto("/admin/verifikasi");
    expect(lama?.status()).toBe(404);
  });

  for (const lebar of [360, 1440]) {
    test(`detail peserta ${lebar}px: tanpa gulir horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: 900 });
      const a = await sisipPendaftar(`Uji E2E Peserta Layar ${lebar}`, { berkas: true });
      await masukSebagai(page, "panitia");
      await page.goto(`/admin/peserta/${a.id}`);
      await expect(page.getByRole("heading", { name: "Lihat berkas" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(lebar);
      await axe(page);
    });
  }

  test("berkas tidak punya URL publik: tanpa sesi ditolak, operator konten ditolak", async ({ page, browser }) => {
    const a = await sisipPendaftar(`Uji E2E Peserta Akses ${Date.now()}`, { berkas: true });
    const url = `/api/v1/admin/peserta/${a.id}/berkas?kunci=akta&i=0`;

    const tanpaSesi = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    expect((await tanpaSesi.request.get(url)).status()).toBe(401);
    await tanpaSesi.close();

    await masukSebagai(page, "konten");
    expect((await page.request.get(url)).status()).toBe(403);
    await page.goto(`/admin/peserta/${a.id}`);
    await expect(page).toHaveURL(/\/admin\?akses=ditolak$/);
  });
});
