import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { masukSebagai, sisipPendaftar } from "./masuk";

async function axe(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

const NAMA = "Uji E2E Peserta";

test.describe("admin: data peserta", () => {
  test("cari, saring, buka detail, ubah data, dan riwayat tercatat", async ({ page }) => {
    test.setTimeout(120_000);
    const unik = `${NAMA} ${Date.now()}`;
    const a = await sisipPendaftar(unik, { status: "pending", asalSekolah: "SMP Alfa E2E" });
    const b = await sisipPendaftar(`${NAMA} Lain ${Date.now()}`, { status: "approved", asalSekolah: "SMP Beta E2E" });
    await masukSebagai(page, "panitia");

    // Cari dan saring
    await page.goto("/admin/peserta?periode=semua");
    await expect(page.getByRole("heading", { name: "Data peserta" })).toBeVisible();
    await page.getByRole("searchbox").fill("SMP Alfa E2E");
    await page.getByRole("button", { name: "Terapkan" }).click();
    await expect(page.getByRole("link", { name: a.nomor })).toBeVisible();
    await expect(page.getByRole("link", { name: b.nomor })).toHaveCount(0);

    await page.goto(`/admin/peserta?periode=semua&q=${encodeURIComponent(NAMA)}&status=approved`);
    await expect(page.getByRole("link", { name: b.nomor })).toBeVisible();
    await expect(page.getByRole("link", { name: a.nomor })).toHaveCount(0);
    await axe(page);

    // Detail
    await page.goto(`/admin/peserta?periode=semua&q=${a.nomor}`);
    await page.getByRole("link", { name: a.nomor }).click();
    await expect(page.getByRole("heading", { level: 1, name: unik })).toBeVisible();
    await expect(page.getByRole("link", { name: "Formulir PDF" })).toBeVisible();
    await axe(page);

    // Ubah: field wajib yang kosong ditolak, lalu dilengkapi dan disimpan
    await page.getByRole("link", { name: "Ubah data" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Ubah data pendaftar" })).toBeVisible();
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Ada isian yang perlu diperbaiki.").or(page.locator("[aria-invalid=true]").first())).toBeVisible();

    const nilai: Record<string, string> = { nik: "3302010101010001", no_kk: "3302010101010002", anak_ke: "2", jumlah_saudara: "3", tinggi_badan: "160", berat_badan: "50", no_hp: "081234567890", no_wa: "081234567891", no_hp_ortu: "081298765432", email: "uji@contoh.id" };
    for (const el of await page.locator("input[name]:not([type=radio]):not([type=hidden]):not([disabled])").all()) {
      if ((await el.inputValue()) !== "") continue;
      await el.fill(nilai[(await el.getAttribute("name")) ?? ""] ?? "Contoh");
    }
    for (const g of await page.locator("fieldset:has(input[type=radio])").all()) await g.locator("input[type=radio]").first().check();
    const kotak = page.getByRole("combobox");
    for (let i = 0; i < (await kotak.count()); i++) {
      if (((await kotak.nth(i).innerText()) ?? "").match(/Pilih salah satu/)) {
        await kotak.nth(i).click();
        await page.getByRole("option").first().click();
      }
    }
    for (const e of await page.getByRole("group", { name: /Nilai ujian/ }).locator("input").all()) await e.fill("80");
    await page.getByLabel(/^Nama lengkap/).fill(`${unik} Ubah`);
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText(/Tersimpan: \d+ isian diubah\./)).toBeVisible();

    await page.getByRole("link", { name: "Kembali ke detail" }).click();
    await expect(page.getByRole("heading", { level: 1, name: `${unik} Ubah` })).toBeVisible();
    await expect(page.getByText("Data diubah")).toBeVisible();
  });

  for (const lebar of [360, 1440]) {
    test(`daftar peserta ${lebar}px: tanpa gulir horizontal halaman dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: 900 });
      await sisipPendaftar(`${NAMA} Layar ${lebar}`);
      await masukSebagai(page, "panitia");
      await page.goto("/admin/peserta?periode=semua");
      await expect(page.getByRole("heading", { name: "Data peserta" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(lebar);
      await axe(page);
    });
  }

  test("operator konten tidak bisa membuka data peserta (halaman dan API)", async ({ page }) => {
    await masukSebagai(page, "konten");
    await page.goto("/admin/peserta");
    await expect(page).toHaveURL(/\/admin\?akses=ditolak$/);
    expect((await page.request.get("/api/v1/admin/peserta/1")).status()).toBe(403);
  });

  test("pendaftar tidak ada menampilkan halaman 404", async ({ page }) => {
    await masukSebagai(page, "panitia");
    const res = await page.goto("/admin/peserta/99999999");
    expect(res?.status()).toBe(404);
  });
});
