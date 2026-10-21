import { expect, test } from "@playwright/test";

// Galeri "Belajar, berkarya, dan beribadah bersama": bergeser sendiri, jeda saat disentuh,
// dan berputar tanpa ujung (tombol tidak pernah mentok).
test.describe("galeri kehidupan sekolah", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/");
    const jalur = page.locator("[data-slider-galeri]");
    await jalur.scrollIntoViewIfNeeded();
    // Galeri siap (sudah hidrasi) bila posisi awal sudah dipindah ke salinan tengah.
    await expect.poll(() => jalur.evaluate((el) => el.scrollLeft), { timeout: 20000 }).toBeGreaterThan(0);
  });

  test("bergeser otomatis dan jeda saat berinteraksi", async ({ page }) => {
    const jalur = page.locator("[data-slider-galeri]");
    const posisi = () => jalur.evaluate((el) => el.scrollLeft);

    // Gambar yang baru dimuat menggeser tata letak; pastikan galeri masih di layar (syarat geser otomatis).
    await jalur.scrollIntoViewIfNeeded();
    const awal = await posisi();
    await page.waitForTimeout(5000);
    expect(await posisi()).toBeGreaterThan(awal + 50);

    await jalur.dispatchEvent("pointerdown");
    await page.waitForTimeout(500);
    const sebelum = await posisi();
    await page.waitForTimeout(3500);
    expect(Math.abs((await posisi()) - sebelum)).toBeLessThan(5);
  });

  test("langsung bergeser begitu galeri terlihat, tanpa menunggu detak pewaktu", async ({ page }) => {
    const jalur = page.locator("[data-slider-galeri]");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(3000); // pewaktu sudah berdetak beberapa kali selagi galeri di luar layar
    const awal = await jalur.evaluate((el) => el.scrollLeft);
    await jalur.scrollIntoViewIfNeeded();
    await expect.poll(() => jalur.evaluate((el) => el.scrollLeft), { timeout: 2200 }).not.toBe(awal);
  });

  test("tetap bergeser walau kursor diam di galeri", async ({ page }) => {
    const jalur = page.locator("[data-slider-galeri]");
    const awal = await jalur.evaluate((el) => el.scrollLeft);
    await jalur.hover();
    await page.waitForTimeout(5000);
    expect(await jalur.evaluate((el) => el.scrollLeft)).not.toBe(awal);
  });

  test("lanjut bergeser setelah tombol panah diklik (fokus tetap di tombol)", async ({ page }) => {
    const jalur = page.locator("[data-slider-galeri]");
    await page.getByRole("button", { name: "Foto berikutnya" }).click();
    await page.waitForTimeout(1200);
    const setelahKlik = await jalur.evaluate((el) => el.scrollLeft);
    await page.waitForTimeout(9000);
    expect(await jalur.evaluate((el) => el.scrollLeft)).not.toBe(setelahKlik);
  });

  for (const [nama, arah] of [["Foto berikutnya", 1], ["Foto sebelumnya", -1]] as const) {
    test(`tombol "${nama}" terus berputar tanpa mentok`, async ({ page }) => {
      const jalur = page.locator("[data-slider-galeri]");
      const diUjung = () => jalur.evaluate((el) => el.scrollLeft <= 8 || el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
      for (let i = 0; i < 14; i++) {
        const sebelum = await jalur.evaluate((el) => el.scrollLeft);
        await page.getByRole("button", { name: nama }).click();
        await page.waitForTimeout(900);
        expect(await diUjung(), `klik ke-${i + 1}`).toBe(false);
        expect(await jalur.evaluate((el) => el.scrollLeft)).not.toBe(sebelum);
      }
      expect(arah).toBeDefined();
    });
  }
});

test.describe("galeri dengan kurangi animasi", () => {
  test.use({ reducedMotion: "reduce" });
  test("tetap bergeser otomatis", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/");
    const jalur = page.locator("[data-slider-galeri]");
    await jalur.scrollIntoViewIfNeeded();
    await expect.poll(() => jalur.evaluate((el) => el.scrollLeft), { timeout: 20000 }).toBeGreaterThan(0);
    const awal = await jalur.evaluate((el) => el.scrollLeft);
    await page.waitForTimeout(5000);
    expect(await jalur.evaluate((el) => el.scrollLeft)).toBeGreaterThan(awal + 50);
  });
});
