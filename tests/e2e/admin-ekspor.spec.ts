import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { masukSebagai, sisipPendaftar } from "./masuk";

test.describe("admin: ekspor data", () => {
  test("filter menentukan isi ekspor; XLSX dan rekap PDF valid; unduhan diaudit", async ({ page }) => {
    test.setTimeout(120_000);
    const kunci = `Uji E2E Peserta Ekspor ${Date.now()}`;
    await sisipPendaftar(`${kunci} A`, { status: "approved" });
    await sisipPendaftar(`${kunci} B`, { status: "pending" });
    await masukSebagai(page, "panitia");

    await page.goto(`/admin/ekspor?periode=semua&q=${encodeURIComponent(kunci)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Ekspor data" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /2\s*pendaftar akan diekspor/ })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const hasil = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);

    // Filter status menyempitkan hasil
    await page.goto(`/admin/ekspor?periode=semua&q=${encodeURIComponent(kunci)}&status=approved`);
    await expect(page.getByRole("heading", { name: /1\s*pendaftar akan diekspor/ })).toBeVisible();

    const href = await page.getByRole("link", { name: "Unduh XLSX" }).getAttribute("href");
    const xlsx = await page.request.get(href!);
    expect(xlsx.status()).toBe(200);
    expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
    expect(xlsx.headers()["content-disposition"]).toMatch(/attachment; filename="Pendaftar-SPMB-semua-\d{4}-\d{2}-\d{2}\.xlsx"/);
    const bytes = await xlsx.body();
    expect(bytes.subarray(0, 2).toString()).toBe("PK"); // berkas zip (xlsx)
    expect(bytes.toString("latin1")).toContain("xl/worksheets/sheet1.xml");

    const pdf = await page.request.get((await page.getByRole("link", { name: "Buka rekap PDF" }).getAttribute("href"))!);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

    // Dari halaman Data Peserta ada pintasan ke ekspor dengan filter yang sama
    await page.goto(`/admin/peserta?periode=semua&q=${encodeURIComponent(kunci)}`);
    await page.getByRole("link", { name: /Ekspor hasil filter ini/ }).click();
    await expect(page).toHaveURL(/\/admin\/ekspor\?/);
    await expect(page.getByRole("heading", { name: /2\s*pendaftar akan diekspor/ })).toBeVisible();

    // Terekam di audit log (dibuka superadmin)
    const super_ = await page.context().browser()!.newContext();
    const p2 = await super_.newPage();
    await masukSebagai(p2, "superadmin");
    await p2.goto("/admin/audit-log?aksi=pendaftar.ekspor");
    await expect(p2.getByRole("cell", { name: /Data diekspor/ }).first()).toBeVisible();
    await super_.close();
  });

  test("filter tanpa hasil menonaktifkan tombol unduh; operator konten ditolak", async ({ page }) => {
    await masukSebagai(page, "panitia");
    await page.goto("/admin/ekspor?periode=semua&q=tidak-ada-yang-cocok-xyz");
    await expect(page.getByText("Tidak ada pendaftar yang cocok dengan filter ini.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Unduh XLSX" })).toHaveCount(0);
    await expect(page.getByText("Unduh XLSX")).toHaveAttribute("aria-disabled", "true");

    await masukSebagai(page, "konten");
    for (const j of ["xlsx", "rekap"]) expect((await page.request.get(`/api/v1/admin/ekspor/${j}`)).status()).toBe(403);
    await page.goto("/admin/ekspor");
    await expect(page).toHaveURL(/\/admin\?akses=ditolak$/);
  });

  test("cron: tertutup tanpa rahasia yang benar", async ({ request }) => {
    for (const j of ["harian", "bersih-draf", "retry-drive", "retry-email"]) {
      const res = await request.get(`/api/v1/cron/${j}`, { headers: { authorization: "Bearer salah" } });
      expect([401, 503], j).toContain(res.status());
    }
  });
});
