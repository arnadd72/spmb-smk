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
    [1440, "/admin/mata-pelajaran"],
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
    for (const h of ["/admin/akun-admin", "/admin/audit-log", "/admin/mata-pelajaran", "/admin/isian-formulir", "/admin/statistik-ocr"]) {
      await page.goto(h);
      await expect(page, h).toHaveURL(/\/admin\?akses=ditolak$/);
    }
    expect((await page.request.get("/api/v1/admin/akun")).status()).toBe(403);
    expect((await page.request.get("/api/v1/admin/form-field")).status()).toBe(403);
  });
});

test.describe("admin sistem: akun admin", () => {
  test("buat akun, masuk dengan password sementara wajib ganti, lalu nonaktifkan dan sesinya berakhir", async ({ page, browser }) => {
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
    await expect(page.getByRole("row", { name: new RegExp(username) })).toContainText("Belum ganti password");

    // Masuk di konteks lain: wajib ganti password, lalu masuk panel sebagai operator konten
    const konteks = await browser.newContext();
    const baru = await konteks.newPage();
    await baru.goto("/admin/login");
    await baru.getByLabel("Username").fill(username);
    await baru.getByLabel("Password").fill(password);
    await baru.getByRole("button", { name: "Masuk" }).click();
    await expect(baru).toHaveURL(/\/admin\/ganti-password$/);
    await baru.getByLabel("Password lama").fill(password);
    await baru.getByLabel(/^Password baru/).fill("PasswordBaruE2E99");
    await baru.getByLabel("Ulangi password baru").fill("PasswordBaruE2E99");
    await baru.getByRole("button", { name: "Simpan password baru" }).click();
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
  });
});

test.describe("admin sistem: mata pelajaran, bobot, dan form builder", () => {
  test("tambah lalu hapus mata pelajaran", async ({ page }) => {
    await masukSebagai(page, "superadmin");
    await page.goto("/admin/mata-pelajaran");
    await page.getByRole("button", { name: "Tambah mata pelajaran" }).click();
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(/Kode 2-30 karakter/)).toBeVisible();

    const kode = `uji_e2e_${Date.now().toString(36)}`;
    await page.getByLabel(/^Kode/).fill(kode);
    await page.getByLabel(/^Nama/).fill("Uji E2E Mapel");
    await page.getByLabel("Alias").fill("Uji Mapel\nMapel Uji");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Mata pelajaran ditambahkan.")).toBeVisible();
    await expect(page.getByRole("row", { name: /Uji E2E Mapel/ })).toContainText("uji mapel, mapel uji");

    // Yang dipakai bobot tidak bisa dihapus
    await page.getByRole("button", { name: "Hapus Matematika" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText(/masih dipakai bobot jurusan/)).toBeVisible();

    await page.getByRole("button", { name: "Hapus Uji E2E Mapel" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page.getByText("Mata pelajaran dihapus.")).toBeVisible();
    await expect(page.getByRole("row", { name: /Uji E2E Mapel/ })).toHaveCount(0);
  });

  test("editor bobot: pratinjau skor langsung berubah, normalisasi, simpan, lalu dipulihkan", async ({ page }) => {
    test.setTimeout(120_000);
    await masukSebagai(page, "superadmin");
    await page.goto("/admin/jurusan-dan-bobot");
    await expect(page.getByRole("heading", { name: "Bobot saran jurusan" })).toBeVisible();

    const mat = page.locator("#bobot-AKL-matematika");
    const awal = await mat.inputValue();
    const skor = page.locator("[data-skor=AKL]");

    await page.locator("#contoh-matematika").fill("100");
    for (const k of ["ips", "b_indonesia", "informatika", "b_inggris"]) await page.locator(`#contoh-${k}`).fill("50");
    const sebelum = Number((await skor.innerText()).replace(",", "."));
    await mat.fill("0,8");
    const sesudah = Number((await skor.innerText()).replace(",", "."));
    expect(sesudah).toBeGreaterThan(sebelum); // bobot matematika (nilai 100) naik => skor naik

    await page.getByRole("button", { name: "Normalisasi ke 1" }).first().click();
    await expect(page.getByText("Total 1").first()).toBeVisible();

    try {
      await page.getByRole("button", { name: "Simpan bobot AKL" }).click();
      await expect(page.getByText(/Bobot tersimpan/)).toBeVisible();
    } finally {
      // pulihkan bobot AKL bawaan (seed): matematika 0,4 ips 0,25 b_indonesia 0,15 informatika 0,1 b_inggris 0,1
      const asli: Record<string, string> = { matematika: awal, ips: "0,25", b_indonesia: "0,15", informatika: "0,1", b_inggris: "0,1" };
      for (const [k, v] of Object.entries(asli)) await page.locator(`#bobot-AKL-${k}`).fill(v);
      await page.getByRole("button", { name: "Simpan bobot AKL" }).click();
      await expect(page.getByText(/Bobot tersimpan/).first()).toBeVisible();
    }
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
