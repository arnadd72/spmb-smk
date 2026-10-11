import { expect, test } from "@playwright/test";
import { buatAkunUji } from "./masuk";

test.describe("login admin", () => {
  test("tanpa login, /admin diarahkan ke halaman masuk", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "Masuk panitia SPMB" })).toBeVisible();
  });

  test("kredensial salah menampilkan pesan umum dan tidak masuk", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Username").fill("superadmin");
    await page.getByLabel("Password").fill("password-salah");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByText("Username atau password salah.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("form kosong menampilkan galat validasi per field", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByText("Username wajib diisi.")).toBeVisible();
    await expect(page.getByText("Password wajib diisi.")).toBeVisible();
  });

  test("login benar masuk ke panel, keluar kembali ke login", async ({ page }) => {
    const akun = await buatAkunUji("panitia");
    await page.goto("/admin/login");
    await page.getByLabel("Username").fill(akun.username);
    await page.getByLabel("Password").fill(akun.password);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("akun wajib ganti password diarahkan ke halaman ganti password dan terkunci sampai diganti", async ({ page }) => {
    const akun = await buatAkunUji("panitia", { wajibGanti: true });
    await page.goto("/admin/login");
    await page.getByLabel("Username").fill(akun.username);
    await page.getByLabel("Password").fill(akun.password);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/admin\/ganti-password$/);

    // Panel dan API terkunci selama belum diganti
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/ganti-password$/);
    const api = await page.request.get("/api/v1/admin/jurusan");
    expect(api.status()).toBe(403);
    expect((await api.json()).code).toBe("PASSWORD_CHANGE_REQUIRED");

    // Validasi
    await page.getByLabel("Password lama").fill(akun.password);
    await page.getByLabel(/^Password baru/).fill("pendek");
    await page.getByLabel("Ulangi password baru").fill("pendek");
    await page.getByRole("button", { name: "Simpan password baru" }).click();
    await expect(page.getByText("Password minimal 10 karakter.")).toBeVisible();

    await page.getByLabel(/^Password baru/).fill("PasswordBaru2026x");
    await page.getByLabel("Ulangi password baru").fill("PasswordBaru2026x");
    await page.getByRole("button", { name: "Simpan password baru" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    expect((await page.request.get("/api/v1/admin/jurusan")).status()).toBe(200);
  });

  test("menu sidebar mengikuti peran: operator konten tidak melihat menu pendaftar dan sistem", async ({ page }) => {
    const akun = await buatAkunUji("konten");
    await page.request.post("/api/v1/admin/login", { data: akun });
    await page.goto("/admin");
    const menu = page.getByRole("navigation", { name: "Menu admin" }).first();
    await expect(menu.getByRole("link", { name: "Berita" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Pengaturan" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Jurusan & Bobot" })).toHaveCount(0);
  });
});
