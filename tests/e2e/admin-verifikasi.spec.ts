import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { masukSebagai, sisipPendaftar } from "./masuk";

async function axe(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("admin: verifikasi", () => {
  test("antrean, penampil berkas, nilai sesuai, revisi (catatan wajib), lalu setujui", async ({ page }) => {
    test.setTimeout(120_000);
    const a = await sisipPendaftar(`Uji E2E Peserta Verif ${Date.now()}`, { berkas: true });
    await masukSebagai(page, "panitia");

    // Antrean memuat pendaftar menunggu
    await page.goto("/admin/verifikasi");
    await expect(page.getByRole("heading", { name: "Verifikasi", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: a.nomor })).toBeVisible();
    await page.getByRole("link", { name: a.nomor }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/verifikasi/${a.id}$`));

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

    // Nilai sesuai
    await page.getByRole("button", { name: "Nilai sesuai" }).click();
    await expect(page.getByText("Nilai dinyatakan sesuai.")).toBeVisible();

    // Koreksi: nilai di luar rentang ditolak
    await page.getByLabel(/Matematika semester 2/).fill("150");
    await page.getByRole("button", { name: "Simpan koreksi nilai" }).click();
    await expect(page.getByText("Maksimal 100.")).toBeVisible();
    await page.getByLabel(/Matematika semester 2/).fill("");

    // Revisi wajib catatan
    await page.getByRole("button", { name: "Perlu revisi" }).click();
    await page.getByRole("button", { name: "Kirim permintaan revisi" }).click();
    await expect(page.getByText(/Catatan revisi minimal 5 karakter/)).toBeVisible();
    await page.getByLabel(/Catatan revisi/).fill("Foto akta kurang jelas, unggah ulang.");
    await page.getByRole("button", { name: "Kirim permintaan revisi" }).click();
    await expect(page.getByText("Permintaan revisi dikirim.")).toBeVisible();

    // Setujui
    await page.getByRole("button", { name: "Setujui" }).click();
    await expect(page.getByText("Pendaftar disetujui.")).toBeVisible();

    // Hasil terlihat di detail dan riwayat
    await page.goto(`/admin/peserta/${a.id}`);
    await expect(page.getByText("Diterima").first()).toBeVisible();
    await expect(page.getByText("Pendaftar disetujui")).toBeVisible();
    await expect(page.getByText("Diminta revisi").first()).toBeVisible();
    await expect(page.getByText("Berkas dilihat").first()).toBeVisible();
  });

  for (const lebar of [360, 1440]) {
    test(`halaman review ${lebar}px: tanpa gulir horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: 900 });
      const a = await sisipPendaftar(`Uji E2E Peserta Layar ${lebar}`, { berkas: true });
      await masukSebagai(page, "panitia");
      await page.goto(`/admin/verifikasi/${a.id}`);
      await expect(page.getByRole("heading", { name: "Keputusan" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(lebar);
      await axe(page);
    });
  }

  test("berkas tidak punya URL publik: tanpa sesi ditolak, operator konten ditolak", async ({ page, browser }) => {
    const a = await sisipPendaftar(`Uji E2E Peserta Akses ${Date.now()}`, { berkas: true });
    const url = `/api/v1/admin/peserta/${a.id}/berkas?kunci=akta&i=0`;

    const tanpaSesi = await browser.newContext();
    expect((await tanpaSesi.request.get(`http://localhost:3000${url}`)).status()).toBe(401);
    await tanpaSesi.close();

    await masukSebagai(page, "konten");
    expect((await page.request.get(url)).status()).toBe(403);
    await page.goto("/admin/verifikasi");
    await expect(page).toHaveURL(/\/admin\?akses=ditolak$/);
  });
});
