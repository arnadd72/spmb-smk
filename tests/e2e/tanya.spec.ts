import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { masukSebagai } from "./masuk";

async function bukaChat(page: Page) {
  await page.getByRole("button", { name: "Tanya Sunan" }).click();
  const dialog = page.getByRole("dialog", { name: "Tanya Sunan" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Tulis pertanyaan")).toBeFocused();
  return dialog;
}

for (const lebar of [1440, 360]) {
  test(`chatbot Tanya Sunan di landing ${lebar}px: pertanyaan cepat, FAQ, pertanyaan di luar FAQ, aksesibilitas`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: lebar, height: 800 });
    await page.goto("/");
    const dialog = await bukaChat(page);

    // Panel muat di layar
    const kotak = await dialog.boundingBox();
    expect(kotak!.x).toBeGreaterThanOrEqual(0);
    expect(kotak!.x + kotak!.width).toBeLessThanOrEqual(lebar);
    expect(kotak!.y + kotak!.height).toBeLessThanOrEqual(800);

    // Pertanyaan cepat dijawab dari FAQ resmi
    await dialog.getByRole("button", { name: "Persyaratan" }).click();
    await expect(dialog.getByRole("log")).toContainText("Akta Kelahiran");
    await expect(dialog.getByRole("log")).toContainText("Jawaban dari FAQ resmi panitia");

    // Pertanyaan bebas yang tidak ada di FAQ: arahan ke panitia, atau jawaban AI berlabel bila kunci Gemini terpasang
    await dialog.getByLabel("Tulis pertanyaan").fill("Apakah ada beasiswa untuk anak yatim piatu?");
    await dialog.getByRole("button", { name: "Kirim pertanyaan" }).click();
    await expect(dialog.getByRole("log").getByText(/Hubungi panitia|Dijawab asisten AI/)).toBeVisible({ timeout: 20_000 });

    // Aksesibilitas dengan panel terbuka
    await page.waitForTimeout(500);
    const hasil = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(hasil.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);

    // Escape menutup dan fokus kembali ke tombol
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Tanya Sunan" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tanya Sunan" })).toBeFocused();
  });
}

test("jawaban aturan memuat tautan, dan pertanyaan kosong tidak terkirim", async ({ page }) => {
  await page.goto("/");
  const dialog = await bukaChat(page);
  await expect(dialog.getByRole("button", { name: "Kirim pertanyaan" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Jurusan" }).click();
  await expect(dialog.getByRole("log")).toContainText("program keahlian");
  await expect(dialog.getByRole("link", { name: "Lihat semua jurusan" })).toHaveAttribute("href", "/jurusan");
});

test("chatbot juga ada di halaman pendaftaran dan cek pendaftaran, tetapi tidak di panel admin", async ({ page }) => {
  await page.goto("/daftar");
  await expect(page.getByRole("button", { name: "Tanya Sunan" })).toBeVisible();
  await page.goto("/cek-pendaftaran");
  await expect(page.getByRole("button", { name: "Tanya Sunan" })).toBeVisible();

  await masukSebagai(page, "panitia");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tanya Sunan" })).toHaveCount(0);
});

test("endpoint /tanya menolak permintaan lintas-origin", async ({ request }) => {
  const res = await request.post("/api/v1/tanya", { data: { pertanyaan: "halo" }, headers: { "sec-fetch-site": "cross-site" } });
  expect(res.status()).toBe(403);
});
