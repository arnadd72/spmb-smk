import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { masukSebagai } from "./masuk";

async function axe(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("admin sistem: halaman dan aksesibilitas", () => {
  for (const [lebar, halaman] of [
    [1440, "/admin/akun-admin"],
    [1440, "/admin/audit-log"],
    [1440, "/admin/isian-formulir"],
    [1440, "/admin/jurusan-dan-bobot"],
    [1440, "/admin/statistik-ocr"],
    [1440, "/admin/kuota"],
    [360, "/admin/isian-formulir"],
    [360, "/admin/audit-log"],
    [360, "/admin/akun-admin"],
  ] as const) {
    test(`${halaman} di ${lebar}px: tanpa gulir horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: 900 });
      await masukSebagai(page, "superadmin");
      await page.goto(halaman);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(lebar);
      await axe(page);
    });
  }

  test("panitia dan operator konten tidak bisa membuka halaman sistem", async ({ page }) => {
    await masukSebagai(page, "panitia");
    for (const h of ["/admin/akun-admin", "/admin/audit-log", "/admin/isian-formulir", "/admin/statistik-ocr", "/admin/jurusan-dan-bobot"]) {
      await page.goto(h);
      await expect(page, h).toHaveURL(/\/admin\?akses=ditolak$/);
    }
    expect((await page.request.get("/api/v1/admin/akun")).status()).toBe(403);
    expect((await page.request.get("/api/v1/admin/form-field")).status()).toBe(403);
  });
});

test.describe("admin sistem: akun admin", () => {
  test("buat akun, masuk dengan password sementara langsung ke panel, lalu nonaktifkan dan sesinya berakhir", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await masukSebagai(page, "superadmin");
    await page.goto("/admin/akun-admin");

    const username = `uji-e2e-${Date.now().toString(36)}`;
    await page.getByRole("button", { name: "Tambah akun" }).click();
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Nama minimal 2 karakter.")).toBeVisible();
    await page.getByLabel(/^Nama/).fill("Uji E2E Operator");
    await page.getByLabel(/^Username/).fill(username);
    await page.getByLabel("Peran").selectOption("konten");
    await page.getByRole("button", { name: "Simpan" }).click();

    const password = (await page.locator("[data-password-sementara]").innerText()).trim();
    expect(password).toHaveLength(14);
    await page.getByRole("button", { name: "Sudah saya catat" }).click();
    await expect(page.getByRole("row", { name: new RegExp(username) })).toContainText("Aktif");

    // Masuk di konteks lain: langsung masuk panel sebagai operator konten (tanpa wajib ganti password)
    const konteks = await browser.newContext();
    const baru = await konteks.newPage();
    await baru.goto("/admin/login");
    await baru.getByLabel("Username").fill(username);
    await baru.getByLabel("Password").fill(password);
    await baru.getByRole("button", { name: "Masuk" }).click();
    await expect(baru).toHaveURL(/\/admin$/);
    await expect(baru.getByText("Operator konten").first()).toBeVisible();

    // Nonaktifkan oleh superadmin: sesi operator langsung ditolak
    await page.getByRole("button", { name: `Nonaktifkan ${username}` }).click();
    await expect(page.getByText(new RegExp(`${username} dinonaktifkan`))).toBeVisible();
    expect((await baru.request.get("/api/v1/admin/me")).status()).toBe(401);
    await baru.goto("/admin/berita");
    await expect(baru).toHaveURL(/\/admin\/login$/);
    await konteks.close();

    // Terekam di audit log
    await page.goto("/admin/audit-log?aksi=akun.buat");
    await expect(page.getByRole("cell", { name: /Akun dibuat/ }).first()).toBeVisible();
  });

  test("superadmin tidak bisa menonaktifkan akunnya sendiri", async ({ page }) => {
    const { username } = await masukSebagai(page, "superadmin");
    await page.goto("/admin/akun-admin");
    await expect(page.getByRole("button", { name: `Nonaktifkan ${username}` })).toBeDisabled();
    // Akun sendiri tidak punya tombol hapus.
    await expect(page.getByRole("button", { name: `Hapus akun ${username}` })).toHaveCount(0);
  });

  test("hapus akun: wajib password superadmin, salah ditolak, benar menghapus permanen dan sesinya berakhir; superadmin tidak bisa ditambah (PRD 1.3 butir 81)", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const { password: passwordSaya } = await masukSebagai(page, "superadmin");
    await page.goto("/admin/akun-admin");

    // Pilihan peran tidak memuat Superadmin untuk akun baru.
    await page.getByRole("button", { name: "Tambah akun" }).click();
    await expect(page.getByLabel("Peran").locator("option", { hasText: "Superadmin" })).toHaveCount(0);
    const username = `uji-hapus-${Date.now().toString(36)}`;
    await page.getByLabel(/^Nama/).fill("Uji E2E Hapus Akun");
    await page.getByLabel(/^Username/).fill(username);
    await page.getByLabel("Peran").selectOption("panitia");
    await page.getByRole("button", { name: "Simpan" }).click();
    const sementara = (await page.locator("[data-password-sementara]").innerText()).trim();
    await page.getByRole("button", { name: "Sudah saya catat" }).click();

    // Akun itu masuk di konteks lain supaya sesinya bisa diuji.
    const konteks = await browser.newContext();
    const baru = await konteks.newPage();
    await baru.goto("/admin/login");
    await baru.getByLabel("Username").fill(username);
    await baru.getByLabel("Password").fill(sementara);
    await baru.getByRole("button", { name: "Masuk" }).click();
    await expect(baru).toHaveURL(/\/admin$/);

    // Password salah: akun tetap ada.
    await page.getByRole("button", { name: `Hapus akun ${username}` }).click();
    await page.getByLabel(/Password Anda/).fill("password-yang-salah");
    await page.getByRole("button", { name: "Hapus permanen" }).click();
    await expect(page.getByText("Password salah.")).toBeVisible();
    // Kotak konfirmasi masih terbuka dan akunnya masih bisa masuk (sesi belum berakhir).
    expect((await baru.request.get("/api/v1/admin/me")).status()).toBe(200);

    // Password benar: akun hilang dan sesinya langsung berakhir.
    await page.getByLabel(/Password Anda/).fill(passwordSaya);
    await page.getByRole("button", { name: "Hapus permanen" }).click();
    await expect(page.getByText(new RegExp(`Akun ${username} dihapus permanen`))).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(username) })).toHaveCount(0);
    expect((await baru.request.get("/api/v1/admin/me")).status()).toBe(401);
    await konteks.close();

    // Tercatat di audit log, dengan akun saya sebagai pelaku.
    await page.goto("/admin/audit-log?aksi=akun.hapus");
    await expect(page.getByRole("cell", { name: /Akun dihapus/ }).first()).toBeVisible();
  });
});

test.describe("admin sistem: jurusan dan form builder", () => {
  test("menu Mata Pelajaran dan editor bobot sudah dihapus (PRD 1.3 butir 65)", async ({ page }) => {
    await masukSebagai(page, "superadmin");
    expect((await page.request.get("/admin/mata-pelajaran")).status()).toBe(404);
    await page.goto("/admin/jurusan-dan-bobot");
    await expect(page.getByRole("heading", { level: 1, name: "Jurusan" })).toBeVisible();
    await expect(page.getByText(/bobot/i)).toHaveCount(0);
    const menu = page.getByRole("navigation", { name: "Menu admin" }).first();
    await expect(menu.getByRole("link", { name: /Mata Pelajaran/ })).toHaveCount(0);
  });

  test("form builder: isian inti terkunci; tambah isian kustom lalu hapus", async ({ page }) => {
    test.setTimeout(120_000);
    await masukSebagai(page, "superadmin");
    await page.goto("/admin/isian-formulir");

    await expect(page.getByLabel("Tampilkan Nama lengkap")).toBeDisabled();
    await expect(page.getByLabel("Wajibkan Nama lengkap")).toBeDisabled();

    await page.getByRole("button", { name: "Tambah isian kustom" }).click();
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Label minimal 2 karakter.")).toBeVisible();

    const label = `Uji E2E Isian ${Date.now().toString(36)}`;
    await page.getByLabel(/^Label/).fill(label);
    await page.getByLabel("Tipe isian").selectOption("select");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Isian pilihan butuh minimal 2 pilihan.")).toBeVisible();
    await page.getByLabel(/^Pilihan/).fill("ya|Ya\ntidak|Tidak");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Isian ditambahkan.")).toBeVisible();
    await expect(page.getByText(label)).toBeVisible();

    await page.getByRole("button", { name: `Hapus ${label}` }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText("Isian dihapus.")).toBeVisible();
    await expect(page.getByText(label)).toHaveCount(0);
  });
});
