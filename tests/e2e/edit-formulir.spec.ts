import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { sisipPendaftar } from "./masuk";

// Cek Pendaftaran (dulu Edit Formulir, poin D): pendaftar membuka formulirnya sendiri dengan nomor dan tanggal lahir, lalu bisa mengganti
// foto Akta, KK, dan pas foto (PRD 1.3 butir 66).
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function masukEdit(page: Page, nomor: string) {
  await page.goto("/cek-pendaftaran");
  await page.getByLabel("Nomor pendaftaran").fill(nomor);
  await page.getByLabel("Tanggal lahir").fill("2011-05-17");
  await page.getByRole("button", { name: "Buka pendaftaran" }).click();
  await expect(page).toHaveURL(/\/cek-pendaftaran\/form$/, { timeout: 30_000 });
}

test.describe("cek pendaftaran oleh pendaftar", () => {
  test("unduh ulang formulir PDF dari sesi Cek Pendaftaran; tanpa sesi ditolak (poin D)", async ({ page, browser }) => {
    const a = await sisipPendaftar(`Uji E2E Peserta Unduh Ulang ${Date.now()}`);
    await masukEdit(page, a.nomor);
    const tautan = page.getByRole("link", { name: "Unduh ulang formulir (PDF)" });
    await expect(tautan).toBeVisible();
    const res = await page.request.get((await tautan.getAttribute("href"))!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["content-disposition"]).toBe(`attachment; filename="Formulir-${a.nomor}.pdf"`);

    const tanpaSesi = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    expect((await tanpaSesi.request.get("/api/v1/edit-formulir/formulir")).status()).toBe(401);
    await tanpaSesi.close();
  });

  test("mengganti KK dan pas foto: langsung tersimpan dan pratinjau tampil; lolos axe", async ({ page }) => {
    test.setTimeout(120_000);
    const a = await sisipPendaftar(`Uji E2E Peserta Edit Berkas ${Date.now()}`, { berkas: true });
    await masukEdit(page, a.nomor);

    const bagian = page.getByRole("region", { name: "Berkas pendaftaran" });
    await expect(bagian).toBeVisible();
    // Akta sudah ada dari pendaftaran; KK dan pas foto belum.
    await expect(bagian.getByRole("img", { name: "Akta kelahiran yang tersimpan" })).toBeVisible();
    await expect(bagian.getByRole("button", { name: "Unggah Kartu keluarga" })).toBeVisible();

    await page.locator("[data-unggah=kk]").setInputFiles({ name: "kk.png", mimeType: "image/png", buffer: PNG });
    const kk = page.locator("[data-berkas-edit=kk]");
    await expect(kk.getByText("Tersimpan.")).toBeVisible();
    const gambar = kk.getByRole("img", { name: "Kartu keluarga yang tersimpan" });
    await expect.poll(() => gambar.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await expect(kk.getByRole("button", { name: "Ganti Kartu keluarga" })).toBeVisible();

    await page.locator("[data-unggah=pas_foto]").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
    await expect(page.locator("[data-berkas-edit=pas_foto]").getByText("Tersimpan.")).toBeVisible();

    // Bertahan setelah dimuat ulang.
    await page.reload();
    await expect(page.getByRole("img", { name: "Kartu keluarga yang tersimpan" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Pas foto 3 x 4 yang tersimpan" })).toBeVisible();

    const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });

  test("berkas tidak bisa dibuka atau diganti tanpa sesi edit", async ({ page, browser }) => {
    const a = await sisipPendaftar(`Uji E2E Peserta Edit Akses ${Date.now()}`, { berkas: true });
    const tanpaSesi = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    expect((await tanpaSesi.request.get("/api/v1/edit-formulir/berkas?kunci=akta")).status()).toBe(401);
    expect(
      (await tanpaSesi.request.post("/api/v1/edit-formulir/berkas", { headers: { "sec-fetch-site": "same-origin" }, multipart: { kunci: "kk", berkas: { name: "kk.png", mimeType: "image/png", buffer: PNG } } })).status(),
    ).toBe(401);
    await tanpaSesi.close();

    // Dengan sesi pun hanya akta, KK, dan pas foto.
    await masukEdit(page, a.nomor);
    expect((await page.request.get("/api/v1/edit-formulir/berkas?kunci=rapor")).status()).toBe(404);
  });
});
