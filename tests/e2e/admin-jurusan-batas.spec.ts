import { expect, test } from "@playwright/test";
import { masukSebagai } from "./masuk";

// Form ubah jurusan: kelebihan karakter ditandai jelas (bagian, baris, jumlah) langsung saat mengetik dan saat Simpan.
// Tes ini tidak pernah berhasil menyimpan, jadi data jurusan tidak berubah.
test.describe("galat batas isian di form ubah jurusan", () => {
  test.beforeEach(async ({ page }) => {
    await masukSebagai(page, "superadmin");
    await page.goto("/admin/jurusan-dan-bobot");
    await page.getByRole("button", { name: "Ubah jurusan AKL" }).click();
    await expect(page.getByLabel("Deskripsi")).toBeVisible();
  });

  test("deskripsi kelebihan: penghitung dan pesan menyebut jumlah dan kelebihannya", async ({ page }) => {
    const deskripsi = page.getByLabel("Deskripsi");
    await deskripsi.fill("d".repeat(4990));
    await expect(page.locator("[data-penghitung]").first()).toHaveText("4990 dari 5000 karakter");
    await expect(page.getByText("Deskripsi terlalu panjang")).toHaveCount(0);

    await deskripsi.fill("d".repeat(5003));
    await expect(page.locator("[data-penghitung]").first()).toHaveText("5003 dari 5000 karakter");
    await expect(page.getByText("Deskripsi terlalu panjang: 5003 karakter, maksimal 5000 (kelebihan 3 karakter).")).toBeVisible();
  });

  test("keunggulan: baris yang kepanjangan disebut nomor dan awalnya; Simpan menolak dan menyebut kolomnya", async ({ page }) => {
    await page.getByLabel("Keunggulan").fill(`Kerjasama:\n1. Aman\n2. ${"k".repeat(1600)}`);
    await expect(page.getByText(/Baris ke-3 \("2\. kkkk.*…"\) terlalu panjang: 1603 karakter, maksimal 1500 \(kelebihan 103\)\./)).toBeVisible();

    await page.getByLabel("Deskripsi").fill("d".repeat(5001));
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Periksa isian yang bertanda galat: Deskripsi, Keunggulan." })).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible(); // tidak tertutup: tidak ada yang tersimpan
  });

  test("isian yang muat tidak menampilkan galat", async ({ page }) => {
    await page.getByLabel("Keunggulan").fill("Kerjasama:\n1. Rita Ritelindo Purwokerto\n2. BRI Ajibarang");
    await expect(page.getByText("terlalu panjang")).toHaveCount(0);
    await expect(page.getByText("Terlalu banyak baris")).toHaveCount(0);
  });
});
