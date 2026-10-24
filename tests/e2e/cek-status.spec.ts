import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("pindah dari landing ke Cek Status tanpa galat DOM (regresi pin-spacer GSAP)", async ({ page }) => {
  const galat: string[] = [];
  page.on("pageerror", (e) => galat.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForTimeout(1500); // GSAP dimuat lazy setelah hidrasi
  await page.getByRole("link", { name: "Cek Status" }).first().click();
  await expect(page).toHaveURL(/\/cek-status$/);
  await page.waitForTimeout(1000);
  expect(galat).toEqual([]);
});

test.describe("panel perjalanan pendaftaran", () => {
  test("tampil dengan tiga tahap dan teks spesifik", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/cek-status");
    await expect(page.getByRole("heading", { name: "Perjalanan satu pendaftaran" })).toBeVisible();
    await expect(page.locator("[data-tahap]")).toHaveCount(3);
    await expect(page.getByRole("heading", { level: 3 })).toHaveText(["Formulir terkirim", "Langsung diterima", "Datang ke sekolah"]);
  });

  test("animasi berjalan: titik tahap berpindah dari mati ke menyala", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/cek-status");
    const titik3 = page.locator("[data-titik-aktif]").nth(2);
    const opasitas = () => titik3.evaluate((e) => parseFloat(getComputedStyle(e).opacity));
    await expect.poll(opasitas, { timeout: 8000 }).toBeLessThan(0.3);
    await expect.poll(opasitas, { timeout: 8000 }).toBeGreaterThan(0.9);
  });

  test("reduced motion: semua tahap tampil penuh tanpa animasi", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/cek-status");
    await page.waitForTimeout(1500);
    for (const sel of ["[data-titik-aktif]", "[data-isi-tahap]"]) {
      const nilai = await page.locator(sel).evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).opacity)));
      expect(nilai.every((n) => n === 1)).toBe(true);
    }
  });

  for (const lebar of [360, 1440]) {
    test(`${lebar}px: tanpa gulir horizontal dan lolos axe`, async ({ page }) => {
      // Reduced motion: axe tidak boleh menangkap tahap yang sedang diredupkan di tengah animasi.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: lebar, height: 780 });
      await page.goto("/cek-status");
      await page.waitForTimeout(800);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(lebar);
      const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(hasil.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }
});
