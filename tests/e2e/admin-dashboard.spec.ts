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
