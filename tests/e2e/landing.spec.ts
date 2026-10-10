import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Landing di 360 dan 1440 px: tanpa gulir horizontal, lolos axe, tangkapan layar di docs/design/.
async function gulirPerlahan(page: Page) {
  await page.evaluate(async () => {
    const tinggi = document.documentElement.scrollHeight;
    for (let y = 0; y < tinggi; y += 300) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

for (const lebar of [360, 1440]) {
  test.describe(`landing ${lebar}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: lebar === 360 ? 780 : 900 });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Belajar terampil");
    });

    test("tanpa gulir horizontal", async ({ page }) => {
      await gulirPerlahan(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(lebar);
    });

    test("judul hero maksimal dua baris dan CTA terlihat tanpa gulir", async ({ page }) => {
      await page.waitForTimeout(1200);
      const h1 = await page.getByRole("heading", { level: 1 }).boundingBox();
      const fontPx = await page.getByRole("heading", { level: 1 }).evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
      const baris = Math.round((h1?.height ?? 0) / (fontPx * 1.02));
      expect(baris, "jumlah baris judul hero").toBeLessThanOrEqual(lebar === 360 ? 3 : 2);

      const cta = await page.getByRole("link", { name: "Daftar Sekarang" }).first().boundingBox();
      expect((cta?.y ?? 9999) + (cta?.height ?? 0)).toBeLessThanOrEqual(lebar === 360 ? 780 : 900);
    });

    test("lolos axe WCAG 2.1 AA", async ({ page }) => {
      await gulirPerlahan(page);
      const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(hasil.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });

    test("tangkapan layar", async ({ page }) => {
      await gulirPerlahan(page);
      await page.screenshot({ path: `docs/design/landing-${lebar}.png`, fullPage: true });
      await page.screenshot({ path: `docs/design/landing-${lebar}-atas.png` });
    });
  });
}

test.describe("interaksi landing (desktop)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("program keahlian: gulir vertikal menggeser panel ke samping (scroll horizontal GSAP)", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1500); // GSAP dan Lenis dimuat lazy setelah hidrasi

    const jalur = page.locator("#jurusan [data-jalur]");
    const sebelum = await jalur.evaluate((e) => new DOMMatrixReadOnly(getComputedStyle(e).transform).m41);

    const atas = await page.locator("#jurusan").evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y + 64 + 1400), atas);
    await page.waitForTimeout(900);

    const sesudah = await jalur.evaluate((e) => new DOMMatrixReadOnly(getComputedStyle(e).transform).m41);
    expect(sesudah, "panel harus bergeser ke kiri").toBeLessThan(sebelum - 300);
    await page.screenshot({ path: "docs/design/landing-1440-program.png" });
    await expect(page.getByRole("heading", { name: "Teknik Kendaraan Ringan" })).toBeAttached();
  });

  test("FAQ: akordeon membuka dan menutup dengan aria-expanded", async ({ page }) => {
    await page.goto("/");
    const tombol = page.getByRole("button", { name: /Apakah saya perlu membuat akun/ });
    await tombol.scrollIntoViewIfNeeded();
    await expect(tombol).toHaveAttribute("aria-expanded", "false");
    await tombol.click();
    await expect(tombol).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Pendaftaran dilakukan tanpa akun")).toBeVisible();
    await tombol.click();
    await expect(tombol).toHaveAttribute("aria-expanded", "false");
  });
});

test("prefers-reduced-motion: konten tetap tampil tanpa animasi", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.waitForTimeout(1200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Daftar Sekarang" }).first()).toBeVisible();
  const opasitas = await page.locator("[data-masuk]").first().evaluate((e) => getComputedStyle(e).opacity);
  expect(opasitas).toBe("1");
  await ctx.close();
});

// Regresi: bagian jurusan pernah terlempar ke bawah layar karena di-pin dua kali (tween kedua memakai ulang
// scrollTrigger yang punya pin: true). Selama rentang pin, bagian harus menempel di bawah navbar dan
// minimal satu panel terlihat, di beberapa ukuran laptop umum.
for (const [lebar, tinggi] of [
  [1280, 720],
  [1366, 768],
  [1536, 864],
] as const) {
  test(`jurusan tidak kosong saat digulir di laptop ${lebar}x${tinggi}`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi });
    await page.goto("/");
    await page.waitForTimeout(2200);

    const awal = await page.locator("#jurusan").evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
    // Panjang rentang pin = padding pin-spacer yang dipasang GSAP; uji di awal, tengah, dan dekat akhir.
    const panjang = await page.locator("#jurusan").evaluate((e) => parseFloat(getComputedStyle(e.parentElement as HTMLElement).paddingBottom));
    expect(panjang, "rentang pin terpasang").toBeGreaterThan(1000);
    for (const offset of [100, Math.round(panjang * 0.4), Math.round(panjang * 0.85)]) {
      await page.evaluate((y) => window.scrollTo(0, y), awal - 64 + offset);
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => {
        const s = document.querySelector("#jurusan") as HTMLElement;
        const t = s.getBoundingClientRect();
        const terlihat = [...s.querySelectorAll("[data-panel]")].some((p) => {
          const b = p.getBoundingClientRect();
          return b.right > 40 && b.left < innerWidth - 40;
        });
        return { atas: Math.round(t.top), terlihat, geserY: new DOMMatrixReadOnly(getComputedStyle(s).transform).m42 };
      });
      expect(r.atas, `bagian jurusan menempel di bawah navbar pada offset ${offset}`).toBeGreaterThanOrEqual(60);
      expect(r.atas).toBeLessThanOrEqual(70);
      expect(r.terlihat, `ada panel terlihat pada offset ${offset}`).toBe(true);
      expect(r.geserY, "tidak ada geseran translateY ekstra (pin ganda)").toBe(0);
    }
  });
}
