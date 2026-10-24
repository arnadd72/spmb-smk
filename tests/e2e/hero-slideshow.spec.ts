import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { masukSebagai } from "./masuk";

// Hero beranda: Foto utama beranda + foto tambahan dari admin bergeser otomatis dari kanan ke kiri. Satu foto = diam.
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

  test("foto bergeser dari kanan ke kiri, juga saat kembali ke foto pertama (dua foto)", async ({ page }) => {
    test.setTimeout(60_000);
    await tambah(page, 1);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator("[data-hero-slide]")).toHaveCount(2);

    // Rekam posisi mendatar tiap foto (dalam satuan lebar foto) setiap frame selama dua pergantian.
    const jejak = await page.evaluate(
      () =>
        new Promise<{ x: number[]; aktif: string | null }[]>((selesai) => {
          const hasil: { x: number[]; aktif: string | null }[] = [];
          const mulai = performance.now();
          const ambil = () => {
            const slide = [...document.querySelectorAll<HTMLElement>("[data-hero-slide]")];
            hasil.push({
              // Posisi nyata relatif ke wadah, dibagi lebar foto yang terukur: Tailwind v4 menggeser lewat properti `translate`
              // (bukan `transform`), dan wadah ikut diskalakan GSAP sehingga skala harus saling meniadakan.
              x: slide.map((s) => {
                const r = s.getBoundingClientRect();
                return (r.left - s.parentElement!.getBoundingClientRect().left) / r.width;
              }),
              aktif: document.querySelector("[data-hero-aktif]")?.getAttribute("data-hero-slide") ?? null,
            });
            if (performance.now() - mulai < 12_000) requestAnimationFrame(ambil);
            else selesai(hasil);
          };
          ambil();
        }),
    );

    // Dua pergantian terjadi: 0 -> 1 -> 0.
    const urutanAktif = jejak.map((j) => j.aktif).filter((a, i, s) => a !== s[i - 1]);
    expect(urutanAktif.slice(0, 3)).toEqual(["0", "1", "0"]);

    // Foto benar-benar terekam di tengah perjalanan masuk dari kanan (bukan berganti seketika atau memudar).
    expect(jejak.some((j) => j.x.some((x) => x > 0.1 && x < 0.9))).toBe(true);

    // Setiap gerakan mengarah ke kiri; satu-satunya lompatan ke kanan adalah foto yang dipindah dari kiri ke kanan tanpa transisi.
    for (let i = 1; i < jejak.length; i++) {
      jejak[i].x.forEach((x, s) => {
        const lalu = jejak[i - 1].x[s];
        if (x > lalu + 0.01) {
          expect(lalu, "foto hanya boleh melompat ke kanan dari posisi kiri").toBeLessThanOrEqual(-0.99);
          expect(x).toBeGreaterThanOrEqual(0.99);
        }
      });
    }
  });

  test("tanpa foto tambahan: satu foto, tidak berganti", async ({ page }) => {
    await masukSebagai(page, "konten");
    await bersihkan(page.request);
    await page.goto("/");
    await expect(page.locator("[data-hero-slide]")).toHaveCount(1);
    await page.waitForTimeout(6500);
    await expect(page.locator('[data-hero-aktif="true"]')).toHaveAttribute("data-hero-slide", "0");
  });

  test("foto tambahan ditambah, diubah, dan dihapus di dalam kartu Foto utama beranda", async ({ page }) => {
    await masukSebagai(page, "konten");
    await bersihkan(page.request);
    await page.goto("/admin/foto-beranda");
    await expect(page.getByRole("heading", { level: 1, name: "Foto Beranda" })).toBeVisible();

    // Tidak ada lagi daftar terpisah: foto tambahan tinggal di kartu Foto utama beranda, kartu paling depan.
    await expect(page.locator('[data-panel-konten="hero"]')).toHaveCount(0);
    await expect(page.locator("[data-aset]").first()).toHaveAttribute("data-aset", "hero");
    const kartu = page.locator('[data-aset="hero"]');
    await expect(kartu.getByRole("button", { name: /Ganti foto/ })).toBeVisible();
    await expect(kartu.getByRole("heading", { name: /Foto berikutnya/ })).toContainText("(0/6)");

    await kartu.getByRole("button", { name: "Tambah foto tambahan beranda" }).click();
    const dialog = page.getByRole("dialog", { name: "Tambah foto tambahan" });
    await dialog.locator("input:not([type=file])").first().fill("/images/sekolah/kultum.webp");
    await dialog.getByLabel("Keterangan").fill(`${AWALAN} lewat form`);
    await dialog.getByRole("button", { name: "Simpan" }).click();
    await expect(dialog).toBeHidden();
    await expect(kartu.getByRole("img", { name: `${AWALAN} lewat form` })).toBeVisible();
    await expect(kartu.getByRole("heading", { name: /Foto berikutnya/ })).toContainText("(1/6)");

    await kartu.getByRole("button", { name: `Ubah ${AWALAN} lewat form` }).click();
    const ubah = page.getByRole("dialog", { name: "Ubah foto tambahan" });
    await ubah.getByLabel("Keterangan").fill(`${AWALAN} diubah`);
    await ubah.getByRole("button", { name: "Simpan" }).click();
    await expect(kartu.getByRole("img", { name: `${AWALAN} diubah` })).toBeVisible();

    await kartu.getByRole("button", { name: `Hapus ${AWALAN} diubah` }).click();
    await page.getByRole("dialog", { name: "Hapus foto tambahan?" }).getByRole("button", { name: "Hapus" }).click();
    await expect(kartu.getByRole("img", { name: `${AWALAN} diubah` })).toHaveCount(0);
    await expect(kartu.getByRole("heading", { name: /Foto berikutnya/ })).toContainText("(0/6)");
  });
});
