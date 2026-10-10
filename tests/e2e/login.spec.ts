import { expect, test } from "@playwright/test";

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
    await page.goto("/admin/login");
    await page.getByLabel("Username").fill(process.env.ADMIN_SEED_USERNAME ?? "superadmin");
    await page.getByLabel("Password").fill(process.env.ADMIN_SEED_PASSWORD ?? "GantiSaya-Dev-2026");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
