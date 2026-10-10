import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Katalog M1 di 360 dan 1440 px: tanpa gulir horizontal, lolos axe, tangkapan layar di docs/design/.
async function gulirSampaiBawah(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
}

for (const lebar of [360, 1440]) {
  test.describe(`${lebar}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: 900 });
      await page.goto("/admin/_katalog");
      await expect(page.getByRole("heading", { name: "Katalog komponen" })).toBeVisible();
    });

    test("tanpa gulir horizontal", async ({ page }) => {
      const lebarDokumen = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(lebarDokumen).toBeLessThanOrEqual(lebar);
    });

    test("lolos axe WCAG 2.1 AA", async ({ page }) => {
      await gulirSampaiBawah(page);
      const hasil = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(hasil.violations.map((v) => `${v.id}: ${v.nodes.length} node`)).toEqual([]);
    });

    test("tangkapan layar", async ({ page }) => {
      await gulirSampaiBawah(page);
      await page.screenshot({ path: `../docs/design/katalog-${lebar}.png`, fullPage: true });
    });
  });
}
