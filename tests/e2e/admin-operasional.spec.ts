import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { masukSebagai } from "./masuk";

async function axe(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(60, 5)]);

test.describe("admin: kuota", () => {
  test("ubah kuota, validasi inline, dan akses hanya untuk panitia", async ({ page }) => {
    await masukSebagai(page, "panitia");
    await page.goto("/admin/kuota");
    await expect(page.getByRole("heading", { name: "Kuota", exact: true })).toBeVisible();
    await axe(page);

    const kolom = page.getByLabel("Kuota AKL");
    const asli = await kolom.inputValue();

    await kolom.fill("abc");
    await page.getByRole("button", { name: "Simpan kuota" }).click();
    await expect(page.getByText("Isi dengan bilangan bulat.")).toBeVisible();
    await kolom.fill("5000");
    await page.getByRole("button", { name: "Simpan kuota" }).click();
    await expect(page.getByText("Kuota antara 0 dan 1000.")).toBeVisible();

    try {
      await kolom.fill("73");
      await page.getByRole("button", { name: "Simpan kuota" }).click();
      await expect(page.getByText(/Kuota AKL disimpan/)).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("Kuota AKL")).toHaveValue("73");
    } finally {
      // kembalikan nilai awal agar data dev tidak berubah
      await page.getByLabel("Kuota AKL").fill(asli);
      await page.getByRole("button", { name: "Simpan kuota" }).click();
      await expect(page.getByText(/Kuota AKL disimpan|Tidak ada perubahan/)).toBeVisible();
    }

    const konten = await masukSebagai(page, "konten");
    void konten;
    expect((await page.request.put("/api/v1/admin/kuota", { data: { kuota: { AKL: 1 } }, headers: { "sec-fetch-site": "same-origin" } })).status()).toBe(403);
  });
});

test.describe("admin: input manual dan kelola berkas", () => {
  test("isi form luring, tersimpan dengan nomor, unggah lalu hapus berkas", async ({ page }) => {
    test.setTimeout(120_000);
    await masukSebagai(page, "panitia");
    await page.goto("/admin/input-manual");
    await expect(page.getByRole("heading", { level: 1, name: /Input manual/ })).toBeVisible();
    await axe(page);

    // Simpan kosong: galat validasi, tidak ada yang tersimpan
    await page.getByRole("button", { name: "Simpan pendaftar luring" }).click();
    await expect(page.getByText("Ada isian yang perlu diperbaiki.")).toBeVisible();

    const nama = `Uji E2E Peserta Luring ${Date.now()}`;
    const nilai: Record<string, string> = { nama_lengkap: nama, nisn: "9876543210", tanggal_lahir: "2011-04-02", nik: "3302010101010009", no_kk: "3302010101010008", anak_ke: "1", jumlah_saudara: "2", tinggi_badan: "158", berat_badan: "48", no_hp: "081200000001", no_wa: "081200000002", no_hp_ortu: "081200000003", email: "luring@contoh.id", nik_ayah: "3302010101010003", nik_ibu: "3302010101010004", ayah_tanggal_lahir: "1980-03-03", ibu_tanggal_lahir: "1983-07-12" };
    for (const el of await page.locator("input[name]:not([type=radio]):not([type=hidden]):not([disabled])").all()) {
      const n = (await el.getAttribute("name")) ?? "";
      await el.fill(nilai[n] ?? "Contoh");
    }
    for (const g of await page.locator("fieldset:has(input[type=radio])").all()) await g.locator("input[type=radio]").first().check();
    const kotak = page.getByRole("combobox");
    for (let i = 0; i < (await kotak.count()); i++) {
      if (/Pilih salah satu/.test(await kotak.nth(i).innerText())) {
        await kotak.nth(i).click();
        await page.getByRole("option").first().click();
      }
    }
    for (const e of await page.getByRole("group", { name: /Nilai ujian/ }).locator("input").all()) await e.fill("80");
    await page.getByLabel(/Matematika semester 1/).fill("88");
    await page.getByLabel(/Ilmu Pengetahuan Alam semester 1/).fill("91");

    await page.getByRole("button", { name: "Simpan pendaftar luring" }).click();
    await expect(page).toHaveURL(/\/admin\/peserta\/\d+\?baru=1$/);
    await expect(page.getByRole("heading", { level: 1, name: nama })).toBeVisible();
    await expect(page.getByText(/Pendaftar luring tersimpan dengan nomor SPMB-\d{4}-\d{4}/)).toBeVisible();
    await expect(page.getByText("Diterima").first()).toBeVisible();

    // Unggah akta lewat pemilih berkas, tampil dengan penanda belum di Drive
    const [pilih] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Ganti akta" }).click()]);
    await pilih.setFiles({ name: "akta-luring.jpg", mimeType: "image/jpeg", buffer: JPG });
    await expect(page.getByRole("link", { name: /Akta kelahiran/ })).toBeVisible();
    await expect(page.getByText("Menunggu Drive")).toBeVisible();

    // Berkas tidak valid ditolak
    const [pilih2] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Ganti KK" }).click()]);
    await pilih2.setFiles({ name: "palsu.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<html>bukan gambar sungguhan, hanya teks biasa".padEnd(60, " ")) });
    await expect(page.getByRole("alert").filter({ hasText: "Format berkas harus JPG, PNG, WebP, atau PDF." })).toBeVisible();

    // Hapus akta (dua langkah)
    await page.getByRole("button", { name: "Hapus Akta kelahiran" }).click();
    await page.getByRole("button", { name: "Yakin hapus" }).click();
    await expect(page.getByRole("link", { name: /Akta kelahiran/ })).toHaveCount(0);
    await expect(page.getByText("Belum ada berkas.")).toBeVisible();
    await axe(page);

    // Muncul di daftar peserta sebagai luring, dicari lewat NIK
    await page.goto("/admin/peserta?sumber=luring&q=3302010101010009");
    await expect(page.getByRole("link", { name: /SPMB-\d{4}-\d{4}/ }).first()).toBeVisible();
    await expect(page.getByText(nama)).toBeVisible();
  });
});
