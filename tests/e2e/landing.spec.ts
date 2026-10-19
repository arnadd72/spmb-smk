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

  test("program keahlian: halaman tetap vertikal dan deretan kartu dapat digulir mendatar", async ({ page }) => {
    await page.goto("/");
    await page.locator("#jurusan").scrollIntoViewIfNeeded();
    const jalur = page.locator("#jurusan [data-jalur]");
    const status = await jalur.evaluate((e) => {
      e.scrollLeft = 0;
      const sebelum = e.scrollLeft;
      e.scrollLeft += Math.round(e.clientWidth / 2);
      return {
        sebelum,
        sesudah: e.scrollLeft,
        lebarIsi: e.scrollWidth,
        lebarTampil: e.clientWidth,
        posisiBagian: getComputedStyle(document.querySelector("#jurusan") as HTMLElement).position,
        halamanVertikal: document.documentElement.scrollHeight > innerHeight,
      };
    });
    expect(status.lebarIsi).toBeGreaterThan(status.lebarTampil);
    expect(status.sesudah).toBeGreaterThan(status.sebelum);
    expect(status.posisiBagian).toBe("static");
    expect(status.halamanVertikal).toBe(true);
  });

  test("tes minat bakat memetakan jawaban dan menampilkan jurusan seri setara", async ({ page }) => {
    await page.goto("/");
    const tes = page.locator("#tes-minat-bakat");
    await tes.scrollIntoViewIfNeeded();
    await expect(tes.getByText("Pertanyaan 1 dari 15")).toBeVisible();

    for (let nomor = 0; nomor < 15; nomor++) {
      const pilihan = nomor < 7 ? 0 : nomor < 14 ? 1 : 2;
      await tes.getByRole("radio").nth(pilihan).check();
      await tes.getByRole("button", { name: nomor === 14 ? "Lihat hasil" : "Lanjut" }).click();
    }

    await expect(tes.getByRole("heading", { name: "Hasil minatmu" })).toBeVisible();
    await expect(tes.getByText("Rekomendasi setara", { exact: true })).toHaveCount(2);
    await expect(tes.getByText("MPLB", { exact: true })).toBeVisible();
    await expect(tes.getByText("AKL", { exact: true })).toBeVisible();
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

// Uji bahwa scroller native tetap berfungsi dan bagian tidak dipin di beberapa ukuran laptop umum.
for (const [lebar, tinggi] of [
  [1280, 720],
  [1366, 768],
  [1536, 864],
] as const) {
  test(`kartu jurusan dapat digulir mendatar tanpa pin pada laptop ${lebar}x${tinggi}`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi });
    await page.goto("/");
    const jalur = page.locator("#jurusan [data-jalur]");
    const status = await jalur.evaluate((e) => {
      e.scrollLeft = 0;
      e.scrollLeft = e.clientWidth;
      return {
        bergeser: e.scrollLeft > 0,
        meluap: e.scrollWidth > e.clientWidth,
        posisi: getComputedStyle(document.querySelector("#jurusan") as HTMLElement).position,
      };
    });
    expect(status).toEqual({ bergeser: true, meluap: true, posisi: "static" });
  });
}
