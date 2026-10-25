import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Cek Pendaftaran (poin D) menggantikan Cek Status dan Edit Formulir: satu halaman untuk melihat, mengubah, dan
// mengunduh ulang formulir. Panel "Perjalanan satu pendaftaran" milik Cek Status sudah dihapus bersama halamannya.

test("pindah dari landing ke Cek Pendaftaran tanpa galat DOM (regresi pin-spacer GSAP)", async ({ page }) => {
  const galat: string[] = [];
  page.on("pageerror", (e) => galat.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForTimeout(1500); // GSAP dimuat lazy setelah hidrasi
  await page.getByRole("link", { name: "Cek Pendaftaran" }).first().click();
  await expect(page).toHaveURL(/\/cek-pendaftaran$/);
  await expect(page.getByRole("heading", { level: 1, name: "Cek pendaftaran" })).toBeVisible();
  await page.waitForTimeout(1000);
  expect(galat).toEqual([]);
});

test("alamat lama Cek Status dan Edit Formulir diarahkan ke Cek Pendaftaran", async ({ page }) => {
  for (const lama of ["/cek-status", "/edit-formulir"]) {
    await page.goto(lama);
    await expect(page).toHaveURL(/\/cek-pendaftaran$/);
  }
  await page.goto("/edit-formulir/form");
  await expect(page).toHaveURL(/\/cek-pendaftaran$/); // tanpa sesi, form dialihkan lagi ke halaman masuk
});

for (const lebar of [360, 1440]) {
  test(`Cek Pendaftaran ${lebar}px: tanpa gulir horizontal dan lolos axe`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: lebar, height: 780 });
    await page.goto("/cek-pendaftaran");
    await expect(page.getByRole("heading", { name: "Unduh ulang formulir" })).toHaveCount(0); // langkah cara pakai bukan judul
    await expect(page.getByText("Unduh ulang formulir", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(lebar);
    const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(hasil.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}
