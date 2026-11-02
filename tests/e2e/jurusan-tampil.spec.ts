import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { masukSebagai } from "./masuk";

// Teks jurusan yang panjang: kartu landing dipotong dan memberi "Baca selengkapnya"; /jurusan memuat deskripsi utuh dan rapi di HP.
// Mengubah jurusan AKL di database e2e lokal, lalu mengembalikannya.
const sama = { "sec-fetch-site": "same-origin" };
const AWAL = "Akuntansi dan Keuangan Lembaga mempelajari pencatatan dan penyusunan laporan keuangan secara manual maupun komputer. ".repeat(4);
const LANJUTAN = "Paragraf kedua tentang kerja sama industri dan tempat PKL yang harus tetap terbaca utuh di halaman jurusan.";
const PANJANG = `${AWAL.trim()}\n\n${LANJUTAN}`;

test.describe("tampilan jurusan dengan teks panjang", () => {
  let asli: Record<string, unknown> | undefined;

  test.beforeEach(async ({ page }) => {
    await masukSebagai(page, "superadmin");
    const res = await page.request.get("/api/v1/admin/jurusan/AKL");
    asli = ((await res.json()) as { data: Record<string, unknown> }).data;
    const put = await page.request.put("/api/v1/admin/jurusan/AKL", {
      headers: sama,
      data: { ...asli, deskripsi: PANJANG, keunggulan: ["Kerjasama Dunia Usaha:", "1. Rita Ritelindo Purwokerto", "Tempat PKL:", "1. Rita Supermall Purwokerto", "Prestasi:", "1. Juara 1 Olimpiade"] },
    });
    expect(put.status()).toBe(200);
  });

  test.afterEach(async ({ page }) => {
    if (asli) await page.request.put("/api/v1/admin/jurusan/AKL", { headers: sama, data: asli });
  });

  test("kartu landing di HP: deskripsi dipotong, ada Baca selengkapnya ke /jurusan#akl", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const kartu = page.locator("#jurusan article").filter({ hasText: "AKL" }).first();
    const tautan = kartu.getByRole("link", { name: "Baca selengkapnya" });
    await expect(tautan).toBeVisible();
    await expect(tautan).toHaveAttribute("href", "/jurusan#akl");
    await expect(kartu).not.toContainText("Paragraf kedua");
    const kotak = await tautan.boundingBox();
    expect(kotak?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  for (const [lebar, tinggi] of [
    [375, 812],
    [768, 1024],
    [1440, 900],
  ] as const) {
    test(`/jurusan ${lebar}px: deskripsi utuh, tanpa geser samping, lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi });
      await page.goto("/jurusan#akl");
      const blok = page.locator("#akl");
      await expect(blok).toBeVisible();
      await expect(blok).toContainText("Paragraf kedua");
      await expect(blok.getByRole("link", { name: "Lihat keunggulan" })).toHaveAttribute("href", "/jurusan/akl");

      await page.waitForTimeout(1500); // animasi muncul (Reveal) harus selesai agar kontras terukur benar
      const luber = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(luber, "halaman tidak boleh bergeser ke samping").toBeLessThanOrEqual(0);

      const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(hasil.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }

  test("detail jurusan menampilkan keunggulan berkelompok", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/jurusan/akl");
    await expect(page.getByRole("heading", { name: "Kerjasama Dunia Usaha" })).toBeVisible();
    const butir = page.getByRole("listitem").filter({ hasText: "Rita Ritelindo Purwokerto" });
    await expect(butir).toBeVisible();
    await expect(butir).toContainText("1."); // penanda ditulis admin, bukan titik otomatis
    await expect(page.locator("li").filter({ hasText: "Rita Ritelindo Purwokerto" })).toHaveCSS("list-style-type", "none");
  });

  test("detail jurusan di desktop: foto sejajar baris atas, deskripsi selebar penuh di bawahnya, kelompok keunggulan berjajar ke samping", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/jurusan/akl");
    await page.waitForTimeout(800);
    const tautan = await page.locator("article > header").getByRole("link", { name: "Semua program keahlian" }).boundingBox();
    const foto = await page.locator("article > header img").first().boundingBox();
    const teks = await page.locator("article > header p.whitespace-pre-line").first().boundingBox();
    expect(tautan && foto && teks).toBeTruthy();
    expect(Math.abs(foto!.y - tautan!.y), "atas foto sejajar baris paling atas").toBeLessThanOrEqual(12);
    expect(teks!.y, "deskripsi di bawah foto, tidak menabrak").toBeGreaterThanOrEqual(foto!.y + foto!.height);
    expect(teks!.width, "deskripsi selebar penuh").toBeGreaterThan(1000);
    expect(foto!.width, "foto tidak diperbesar").toBeLessThanOrEqual(24 * 16 + 1);

    const kelompok = await page.locator("#keunggulan ~ div > div").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(kelompok.length).toBe(3);
    expect(new Set(kelompok).size, "ketiga kelompok sebaris").toBe(1);
  });

  test("detail jurusan di HP: tanpa geser samping, urutan judul, foto, deskripsi", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/jurusan/akl");
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    const judul = await page.getByRole("heading", { level: 1 }).boundingBox();
    const foto = await page.locator("article > header img").first().boundingBox();
    const teks = await page.locator("article > header p.whitespace-pre-line").first().boundingBox();
    expect(judul!.y).toBeLessThan(foto!.y);
    expect(foto!.y).toBeLessThan(teks!.y);
  });

  test("deskripsi berisi daftar bernomor: daftar berjajar ke samping di desktop, bertumpuk rapi di HP", async ({ page }) => {
    const deskripsi = [
      "Merupakan Salah Satu Program Keahlian Dalam Kelompok Bisnis Dan Manajemen Yang Bertujuan Untuk Mempelajari Pencatatan Dan Penyusunan Laporan Keuangan. ",
      "",
      "Kerjasama Dunia Usaha Dan Dunia Industri Jurusan Akl :",
      "1.    Rita Ritelindo Purwokerto",
      "2.    Bri Kantor Cabang Ajibarang",
      "3.    Hotel Aston Imperium Purwokerto",
      "4.    Pt. Tiga Putra Abadi Perkasa Purbalingga",
      "",
      "Tempat Pkl Jurusan Akl Diantaranya : ",
      "1.    Rita Supermall Purwokerto",
      "2.    Kantor Pajak Pratama Purwokerto",
      "3.    Bprs Artha Leksana Wangon",
      "4.    Bpr Gunung Slamet Jeruklegi",
      "5.    Rita Kato Kroya-Cilacap",
      "6.    Bri Kantor Cabang Ajibarang",
      "7.    Pt Tiga Putra Abadi Perkasa Purbalingga",
    ].join("\n");
    const put = await page.request.put("/api/v1/admin/jurusan/AKL", { headers: sama, data: { ...asli, deskripsi, keunggulan: [] } });
    expect(put.status()).toBe(200);
    const judul = page.locator("article > header h3");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/jurusan/akl");
    await page.waitForTimeout(800);
    await expect(judul).toHaveCount(2);
    const [a, b] = await judul.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(a, "dua daftar sebaris, berjajar ke samping").toBe(b);
    const nomor = page.locator("article > header li").first();
    await expect(nomor.locator("span").first()).toHaveText("1.");
    await expect(nomor.locator("span").nth(1)).toHaveText("Rita Ritelindo Purwokerto");

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/jurusan/akl");
    await page.waitForTimeout(800);
    const [c, d] = await judul.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(d, "di HP daftar bertumpuk").toBeGreaterThan(c);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

    await page.goto("/jurusan#akl");
    await page.waitForTimeout(1500);
    const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(hasil.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
});
