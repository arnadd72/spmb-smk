import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { masukSebagai } from "./masuk";

// Konten dari admin tampil di landing: berita dengan gambar hasil unggah, agenda, testimoni, galeri. Memakai database dev.
const AWALAN = "Uji E2E Landing";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const sama = { "sec-fetch-site": "same-origin" };

async function bersihkan(api: APIRequestContext) {
  for (const jalur of ["berita", "event", "testimoni", "galeri"]) {
    const res = await api.get(`/api/v1/admin/${jalur}?per=100`);
    if (!res.ok()) continue;
    const { data } = (await res.json()) as { data: { id: string; judul?: string; nama?: string }[] };
    for (const b of data.filter((x) => (x.judul ?? x.nama ?? "").startsWith(AWALAN))) await api.delete(`/api/v1/admin/${jalur}/${b.id}`, { headers: sama });
  }
}

test.describe("landing menampilkan konten admin", () => {
  test.afterEach(async ({ page }) => {
    await bersihkan(page.request);
  });

  test("berita dengan gambar unggahan, agenda, dan testimoni muncul; gambar dihapus bersama beritanya", async ({ page }) => {
    test.setTimeout(120_000);
    await masukSebagai(page, "konten");
    await bersihkan(page.request);
    const judul = `${AWALAN} berita ${Date.now()}`;

    // Unggah gambar lewat form berita
    await page.goto("/admin/berita");
    await page.getByRole("button", { name: /Tambah berita/ }).first().click();
    await page.getByLabel(/Judul/).fill(judul);
    await page.getByLabel(/Isi berita/).fill("<p>Isi berita uji landing.</p>");
    await page.locator("[data-unggah-gambar]").setInputFiles({ name: "sampul.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByAltText("Pratinjau gambar")).toBeVisible();
    const alamat = await page.getByPlaceholder(/images/).inputValue();
    expect(alamat).toMatch(/^\/uploads\/konten\/\d{4}\/\d{2}\/[\w-]+\.png$/);
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(judul)).toBeVisible();

    // Gambar tersaji publik
    expect((await page.request.get(alamat)).status()).toBe(200);

    // Agenda dan testimoni lewat API (CRUD-nya sudah diuji sendiri)
    const besok = new Date(Date.now() + 3 * 86400_000).toISOString();
    expect((await page.request.post("/api/v1/admin/event", { headers: sama, data: { judul: `${AWALAN} agenda`, tanggal: besok, lokasi: "Aula", isActive: true } })).status()).toBe(201);
    expect((await page.request.post("/api/v1/admin/testimoni", { headers: sama, data: { nama: `${AWALAN} Alumni`, keterangan: "Alumni AKL", isi: "Belajarnya menyenangkan dan terarah.", isActive: true } })).status()).toBe(201);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Kabar dari sekolah." })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(judul) })).toBeVisible();
    await expect(page.getByText(`${AWALAN} agenda`)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Kata mereka/ })).toBeVisible();
    await expect(page.getByText("Belajarnya menyenangkan dan terarah.")).toBeVisible();

    // Aksesibilitas bagian baru
    for (const id of ["#kabar", "#testimoni"]) await page.locator(id).scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const hasil = await new AxeBuilder({ page }).include("#kabar").include("#testimoni").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);

    // Hapus berita: gambar unggahan ikut terhapus (tombol hapus di UI sudah diuji di admin-konten.spec)
    const { data } = (await (await page.request.get(`/api/v1/admin/berita?q=${encodeURIComponent(judul)}`)).json()) as { data: { id: string }[] };
    expect((await page.request.delete(`/api/v1/admin/berita/${data[0].id}`, { headers: sama })).status()).toBe(204);
    expect((await page.request.get(alamat)).status()).toBe(404);
  });

  test("galeri admin (satu foto saja sudah cukup) menggantikan foto bawaan di bagian Kehidupan sekolah", async ({ page }) => {
    await masukSebagai(page, "konten");
    await bersihkan(page.request);
    for (let i = 1; i <= 1; i++) {
      expect((await page.request.post("/api/v1/admin/galeri", { headers: sama, data: { judul: `${AWALAN} foto ${i}`, gambar: "/images/sekolah/kultum.webp", urutan: i, isActive: true } })).status()).toBe(201);
    }
    await page.goto("/");
    // Galeri berputar tanpa ujung: ada tiga salinan, hanya yang tengah terbaca pembaca layar (tanpa aria-hidden).
    const asli = page.locator("[data-slider-galeri] li:not([aria-hidden])");
    await expect(asli.getByText(`${AWALAN} foto 1`)).toBeVisible();
    await expect(page.getByText("Kultum bersama di musala.")).toHaveCount(0);
    // Satu foto saja: tampil diam, tanpa tombol panah.
    await expect(page.getByRole("button", { name: "Foto berikutnya" })).toHaveCount(0);
    await expect(page.locator("[data-slider-galeri] li")).toHaveCount(1);

    await bersihkan(page.request);
    await page.goto("/");
    await expect(page.locator("[data-slider-galeri] li:not([aria-hidden])").getByText("Kultum bersama di musala.")).toBeVisible();
  });

  test("endpoint JSON publik terbuka tanpa login dan tidak memuat konten nonaktif", async ({ request }) => {
    for (const jalur of ["landing", "jurusan", "berita", "faq", "mapel", "form-schema"]) {
      const res = await request.get(`/api/v1/${jalur}`);
      expect(res.status(), jalur).toBe(200);
      expect(res.headers()["cache-control"], jalur).toContain("public");
    }
    expect((await request.get("/api/v1/jurusan/akl")).status()).toBe(200);
    expect((await request.get("/api/v1/jurusan/xyz")).status()).toBe(404);
    expect((await request.get("/api/v1/berita/tidak-ada")).status()).toBe(404);
  });
});
