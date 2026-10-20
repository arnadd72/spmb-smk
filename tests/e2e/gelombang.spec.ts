import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { masukSebagai } from "./masuk";

async function axe(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

const geser = (hari: number) => new Date(Date.now() + 7 * 3600_000 + hari * 86400_000).toISOString().slice(0, 10);

test("admin: tambah gelombang, tampil di landing, tumpang tindih ditolak, lalu dihapus", async ({ page }) => {
  test.setTimeout(120_000);
  await masukSebagai(page, "panitia");
  await page.goto("/admin/gelombang");
  await expect(page.getByRole("heading", { level: 1, name: "Gelombang pendaftaran" })).toBeVisible();
  await axe(page);

  const nama = `Uji E2E Gelombang ${Date.now()}`;
  try {
    // Isian kosong ditolak di klien.
    await page.getByRole("button", { name: "Tambah gelombang" }).first().click();
    await page.getByLabel("Nama gelombang").fill("");
    await page.getByRole("button", { name: "Tambah gelombang" }).last().click();
    await expect(page.getByText("Nama gelombang wajib diisi.")).toBeVisible();

    await page.getByLabel("Nama gelombang").fill(nama);
    await page.getByLabel("Tanggal buka").fill(geser(-1));
    await page.getByLabel("Tanggal tutup").fill(geser(30));
    await page.getByLabel("Kuota").fill("40");
    await page.getByRole("button", { name: "Tambah gelombang" }).last().click();
    await expect(page.getByRole("heading", { name: nama })).toBeVisible();
    await expect(page.getByText("Sedang dibuka").first()).toBeVisible();

    // Landing menampilkan jadwal dan sisa kuota.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Jadwal gelombang pendaftaran." })).toBeAttached();
    await expect(page.getByRole("heading", { name: nama })).toBeAttached();
  } finally {
    await page.goto("/admin/gelombang");
    const kartu = page.locator("section", { has: page.getByRole("heading", { name: nama }) });
    if (await kartu.count()) {
      page.once("dialog", (d) => void d.accept());
      await kartu.getByRole("button", { name: "Ubah gelombang" }).click();
      await kartu.getByRole("button", { name: "Hapus" }).click();
      await expect(page.getByRole("heading", { name: nama })).toHaveCount(0);
    }
  }
});
