import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { masukSebagai } from "./masuk";

// Testimoni di landing: satu baris, bergeser otomatis, berpindah lewat titik di bawah kartu (tanpa tombol panah).
const AWALAN = "Uji E2E Testimoni";
const sama = { "sec-fetch-site": "same-origin" };

async function bersihkan(api: APIRequestContext) {
  const res = await api.get("/api/v1/admin/testimoni?per=100");
  if (!res.ok()) return;
  const { data } = (await res.json()) as { data: { id: string; nama: string }[] };
  for (const t of data.filter((x) => x.nama.startsWith(AWALAN))) await api.delete(`/api/v1/admin/testimoni/${t.id}`, { headers: sama });
}

async function buat(page: Page, jumlah: number, opsi: { lebar?: number; isi?: (i: number) => string } = {}) {
  await masukSebagai(page, "konten");
  await bersihkan(page.request);
  for (let i = 1; i <= jumlah; i++) {
    const res = await page.request.post("/api/v1/admin/testimoni", {
      headers: sama,
      data: { nama: `${AWALAN} ${i}`, keterangan: "Alumni", isi: opsi.isi?.(i) ?? `Isi testimoni nomor ${i}.`, urutan: i, isActive: true },
    });
    expect(res.status()).toBe(201);
  }
  await page.setViewportSize({ width: opsi.lebar ?? 360, height: 780 });
  await page.goto("/");
  const jalur = page.locator("[data-slider-testimoni]");
  await jalur.scrollIntoViewIfNeeded();
  return jalur;
}

test.describe("testimoni landing", () => {
  test.afterEach(async ({ page }) => {
    await bersihkan(page.request);
  });

  test("bergeser otomatis, titik menandai yang aktif, dan tanpa tombol panah", async ({ page }) => {
    const jalur = await buat(page, 3);
    await expect.poll(() => jalur.evaluate((el) => el.scrollLeft), { timeout: 20000 }).toBeGreaterThan(0);
    await jalur.scrollIntoViewIfNeeded();

    await expect(page.locator("#testimoni").getByRole("button", { name: /sebelumnya|berikutnya/i })).toHaveCount(0);
    await expect(page.locator("[data-titik-testimoni]")).toHaveCount(3);
    const terpilih = page.locator("[data-titik-testimoni][aria-current=true]");
    await expect(terpilih).toHaveAttribute("data-titik-testimoni", "0");
    await expect(terpilih).toHaveAttribute("data-titik-testimoni", "1", { timeout: 12000 });
  });

  test("klik titik membawa ke testimoni itu", async ({ page }) => {
    const jalur = await buat(page, 3);
    await expect.poll(() => jalur.evaluate((el) => el.scrollLeft), { timeout: 20000 }).toBeGreaterThan(0);

    await page.locator('[data-titik-testimoni="2"]').click();
    await expect(page.locator('[data-titik-testimoni="2"]')).toHaveAttribute("aria-current", "true", { timeout: 4000 });
    // Kartu yang terlihat di tengah jalur adalah testimoni ke-3.
    const tengah = await jalur.evaluate((el) => {
      const kotak = el.getBoundingClientRect();
      const x = kotak.left + kotak.width / 2;
      const li = Array.from(el.querySelectorAll("li")).find((l) => {
        const r = l.getBoundingClientRect();
        return r.left <= x && r.right >= x;
      });
      return li?.textContent ?? "";
    });
    expect(tengah).toContain("Isi testimoni nomor 3.");

    // Klik titik pertama kembali ke testimoni pertama.
    await page.locator('[data-titik-testimoni="0"]').click();
    await expect(page.locator('[data-titik-testimoni="0"]')).toHaveAttribute("aria-current", "true", { timeout: 4000 });
  });

  test("lebih dari empat testimoni: semuanya tampil sebagai titik dan kartu (dulu hanya 4 pertama)", async ({ page }) => {
    await buat(page, 6);
    await expect(page.locator("[data-titik-testimoni]")).toHaveCount(6);
    // Kartu terakhir ada di jalur (tiga salinan: 6 x 3 = 18 kartu).
    await expect(page.locator("[data-slider-testimoni] li", { hasText: "Isi testimoni nomor 6." })).not.toHaveCount(0);
  });

  test("satu testimoni saja: tanpa titik", async ({ page }) => {
    await buat(page, 1);
    await expect(page.getByText(`${AWALAN} 1`).first()).toBeVisible();
    await expect(page.locator("[data-titik-testimoni]")).toHaveCount(0);
  });

  test("kolom menyesuaikan jumlah: dua testimoni di desktop tampil berdampingan tanpa geser dan tanpa titik", async ({ page }) => {
    const jalur = await buat(page, 2, { lebar: 1440 });
    const kartu = jalur.locator("li:not([inert])");
    await expect(kartu).toHaveCount(2);
    const [a, b] = await kartu.evaluateAll((li) => li.map((l) => l.getBoundingClientRect()));
    expect(Math.abs(a.top - b.top)).toBeLessThan(2);
    expect(b.left).toBeGreaterThan(a.right);
    await expect(page.locator("[data-titik-testimoni]")).toHaveCount(0);
  });

  test("testimoni panjang dipotong dengan Baca selengkapnya, yang pendek tanpa tombol", async ({ page }) => {
    const panjang = "Guru-gurunya sabar dan praktiknya banyak sehingga saya cepat paham dan percaya diri. ".repeat(6).trim(); // di bawah batas 600 karakter
    await buat(page, 2, { lebar: 1440, isi: (i) => (i === 1 ? panjang : "Singkat saja, mantap.") });
    const tombol = page.locator("#testimoni [data-baca-testimoni]");
    await expect(tombol).toHaveCount(1);
    await expect(tombol).toHaveText("Baca selengkapnya");
    const kutipan = page.locator("#testimoni blockquote").first();
    const tinggiAwal = await kutipan.evaluate((el) => el.getBoundingClientRect().height);
    await tombol.click();
    await expect(tombol).toHaveText("Tutup");
    await expect(tombol).toHaveAttribute("aria-expanded", "true");
    expect(await kutipan.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(tinggiAwal + 40);
  });
});
