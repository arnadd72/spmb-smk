import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { masukSebagai } from "./masuk";

for (const lebar of [360, 1440]) {
  test.describe(`dashboard admin ${lebar}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: 900 });
      await masukSebagai(page, "panitia");
      await page.goto("/admin");
      await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    });

    test("menampilkan kartu ringkasan, grafik, dan kuota tanpa gulir horizontal", async ({ page }) => {
      await expect(page.getByText("Total pendaftar")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Pendaftar per hari" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Kuota per jurusan" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(lebar);
    });

    test("lolos axe WCAG 2.1 AA", async ({ page }) => {
      await page.waitForTimeout(400);
      const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
    });
  });
}

test("panitia tidak boleh membuka halaman sistem (diarahkan ke dashboard dengan pesan)", async ({ page }) => {
  await masukSebagai(page, "panitia");
  await page.goto("/admin/pengaturan");
  await expect(page).toHaveURL(/\/admin\?akses=ditolak$/);
  await expect(page.getByText("Peran Anda tidak memiliki akses")).toBeVisible();
});

test("sidebar admin tetap di tempat saat halaman digulir, dan bisa digulir sendiri di layar pendek", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 500 });
  await masukSebagai(page, "superadmin");
  await page.goto("/admin/isian-formulir"); // halaman panjang
  await expect(page.getByRole("heading", { level: 1, name: "Isian formulir" })).toBeVisible();
  const aside = page.locator("aside").first();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  const kotak = await aside.boundingBox();
  expect(kotak?.y).toBe(0); // menempel di atas layar walau halaman sudah digulir jauh
  expect(kotak?.height).toBeLessThanOrEqual(500);

  // Menu lebih panjang dari layar: sidebar digulir sendiri tanpa menggeser isi halaman
  const yHalaman = await page.evaluate(() => window.scrollY);
  const bisaGulir = await aside.evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(bisaGulir).toBe(true);
  await aside.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  expect(await aside.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(yHalaman);
});
