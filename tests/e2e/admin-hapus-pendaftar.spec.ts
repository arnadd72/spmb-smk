import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { masukSebagai, sisipPendaftar } from "./masuk";

// Hapus Pendaftar (PRD 1.3 butir 75): hanya superadmin, tiga cara memilih, konfirmasi dengan password.
// Hanya pendaftar bernama "Uji E2E Peserta ..." yang dihapus di sini; tab tanggal dan nomor cukup sampai pratinjau
// karena rentangnya bisa memuat pendaftar uji milik tes lain.

test.describe("hapus pendaftar", () => {
  test("memilih manual, password salah ditolak, password benar menghapus", async ({ page }) => {
    const { password } = await masukSebagai(page, "superadmin");
    const nama = `Uji E2E Peserta Hapus ${Date.now()}`;
    await sisipPendaftar(nama);

    await page.goto("/admin/hapus-pendaftar");
    await expect(page.getByRole("heading", { name: "Hapus pendaftar", level: 1 })).toBeVisible();
    await page.getByLabel("Periode").selectOption("semua");
    await page.getByLabel("Cari nama atau nomor pendaftaran").fill(nama);
    await page.getByRole("checkbox", { name: `Pilih ${nama}` }).check();

    await page.getByRole("button", { name: "Hapus 1 pendaftar" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Hapus 1 pendaftar secara permanen?" })).toBeVisible();

    await dialog.getByLabel("Password admin Anda").fill("password-yang-salah");
    await dialog.getByRole("button", { name: "Hapus permanen" }).click();
    await expect(dialog.getByText("Password salah.")).toBeVisible();

    await dialog.getByLabel("Password admin Anda").fill(password);
    await dialog.getByRole("button", { name: "Hapus permanen" }).click();
    await expect(dialog.getByText("1 pendaftar terhapus.")).toBeVisible();
    await dialog.getByRole("button", { name: "Tutup" }).first().click();

    await page.getByLabel("Cari nama atau nomor pendaftaran").fill(`${nama} `);
    await expect(page.getByRole("checkbox", { name: `Pilih ${nama}` })).toHaveCount(0);
  });

  test("tab tanggal dan nomor urut menampilkan pratinjau jumlah sebelum tombol hapus aktif", async ({ page }) => {
    await masukSebagai(page, "superadmin");
    await sisipPendaftar(`Uji E2E Peserta Pratinjau ${Date.now()}`);
    await page.goto("/admin/hapus-pendaftar");

    await page.getByRole("tab", { name: "Berdasarkan tanggal" }).click();
    // Kemarin sampai besok (WIB): baris yang disisipkan lewat SQL mentah bisa terbaca bergeser sehari menurut zona waktu Postgres lokal.
    const hari = (selisih: number) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date(Date.now() + selisih * 86400_000));
    await page.getByLabel("Periode").selectOption("2027/2028");
    await page.getByLabel("Dari tanggal").fill(hari(-1));
    await page.getByLabel("Sampai tanggal").fill(hari(1));
    await expect(page.getByText(/\d+ pendaftar akan dihapus/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Hapus \d+ pendaftar$/ })).toBeEnabled();

    await page.getByRole("tab", { name: "Berdasarkan nomor urut" }).click();
    await page.getByLabel("Periode").selectOption("2027/2028");
    await page.getByLabel("Dari nomor urut").fill("9990");
    await page.getByLabel("Sampai nomor urut").fill("9991");
    await expect(page.getByText("Tidak ada pendaftar yang cocok dengan pilihan ini.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Hapus \d+ pendaftar$/ })).toHaveCount(0);
  });

  test("rentang tanggal terbalik ditolak dengan pesan, bukan menghapus semua", async ({ page }) => {
    await masukSebagai(page, "superadmin");
    await page.goto("/admin/hapus-pendaftar");
    await page.getByRole("tab", { name: "Berdasarkan tanggal" }).click();
    await page.getByLabel("Dari tanggal").fill("2026-10-26");
    await page.getByLabel("Sampai tanggal").fill("2026-10-25");
    await expect(page.getByText("Tanggal awal tidak boleh setelah tanggal akhir.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Hapus \d+ pendaftar$/ })).toHaveCount(0);
  });

  test("panitia diarahkan keluar dari halaman", async ({ page }) => {
    await masukSebagai(page, "panitia");
    await page.goto("/admin/hapus-pendaftar");
    await expect(page).toHaveURL(/\/admin\?akses=ditolak/);
    await expect(page.getByRole("heading", { name: "Hapus pendaftar", level: 1 })).toHaveCount(0);
  });

  test("halaman lolos axe", async ({ page }) => {
    await masukSebagai(page, "superadmin");
    await page.goto("/admin/hapus-pendaftar");
    await expect(page.getByRole("heading", { name: "Hapus pendaftar", level: 1 })).toBeVisible();
    const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
});
