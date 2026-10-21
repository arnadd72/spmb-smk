import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { masukSebagai } from "./masuk";

// Hero beranda: Foto utama beranda + foto tambahan dari admin berganti otomatis (crossfade). Satu foto = diam.
const AWALAN = "Uji E2E Hero";
const sama = { "sec-fetch-site": "same-origin" };

async function bersihkan(api: APIRequestContext) {
  const res = await api.get("/api/v1/admin/hero?per=100");
  if (!res.ok()) return;
  const { data } = (await res.json()) as { data: { id: string; judul: string | null }[] };
  for (const h of data.filter((x) => (x.judul ?? "").startsWith(AWALAN))) await api.delete(`/api/v1/admin/hero/${h.id}`, { headers: sama });
}

async function tambah(page: Page, jumlah: number) {
  await masukSebagai(page, "konten");
  await bersihkan(page.request);
  for (let i = 1; i <= jumlah; i++) {
    const res = await page.request.post("/api/v1/admin/hero", {
      headers: sama,
      data: { judul: `${AWALAN} ${i}`, gambar: i % 2 ? "/images/sekolah/kultum.webp" : "/images/sekolah/istighotsah.webp", urutan: i, isActive: true },
    });
    expect(res.status()).toBe(201);
  }
}

test.describe("hero beranda berganti foto otomatis", () => {
  test.afterEach(async ({ page }) => {
    await bersihkan(page.request);
  });

  test("foto utama + 2 foto tambahan berganti otomatis", async ({ page }) => {
    await tambah(page, 2);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator("[data-hero-slide]")).toHaveCount(3);
    await expect(page.locator('[data-hero-aktif="true"]')).toHaveAttribute("data-hero-slide", "0");
    await expect(page.locator('[data-hero-aktif="true"]')).toHaveAttribute("data-hero-slide", "1", { timeout: 9000 });
    // Foto yang tidak aktif disembunyikan dari pembaca layar.
    await expect(page.locator("[data-hero-slide]:not([data-hero-aktif])").first()).toHaveAttribute("aria-hidden", "true");
  });

  test("tanpa foto tambahan: satu foto, tidak berganti", async ({ page }) => {
    await masukSebagai(page, "konten");
    await bersihkan(page.request);
    await page.goto("/");
    await expect(page.locator("[data-hero-slide]")).toHaveCount(1);
    await page.waitForTimeout(6500);
    await expect(page.locator('[data-hero-aktif="true"]')).toHaveAttribute("data-hero-slide", "0");
  });

  test("tombol Tambah foto ada di kartu Foto utama beranda dan menambah ke daftar", async ({ page }) => {
    await masukSebagai(page, "konten");
    await bersihkan(page.request);
    await page.goto("/admin/galeri");
    const bagian = page.locator('[data-panel-konten="hero"]');
    await expect(bagian.getByRole("heading", { level: 2, name: "Foto tambahan beranda" })).toBeVisible();
    await expect(bagian.getByText("Belum ada foto tambahan")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Galeri" })).toBeVisible();

    // Tombol tambah ada di kartu "Foto utama beranda", di sebelah tombol ganti foto (bukan di judul bagian).
    await expect(bagian.getByRole("button", { name: /^Tambah/ })).toHaveCount(0);
    const kartu = page.locator('[data-aset="hero"]');
    await expect(kartu.getByRole("button", { name: /Ganti foto/ })).toBeVisible();
    await kartu.getByRole("button", { name: "Tambah foto tambahan beranda" }).click();
    const dialog = page.getByRole("dialog", { name: "Tambah foto tambahan" });
    await expect(dialog).toBeVisible();

    // Simpan lewat formulir, lalu muncul di daftar Foto tambahan beranda.
    await dialog.locator("input:not([type=file])").first().fill("/images/sekolah/kultum.webp");
    await dialog.getByLabel("Keterangan").fill(`${AWALAN} lewat form`);
    await dialog.getByRole("button", { name: "Simpan" }).click();
    await expect(bagian.getByText(`${AWALAN} lewat form`)).toBeVisible();
  });
});
