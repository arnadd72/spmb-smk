import { expect, type Page } from "@playwright/test";

// Login lewat API (cookie tersimpan di konteks browser). Butuh dev server dan superadmin hasil `npm run db:seed`.
export async function masukSebagaiSuperadmin(page: Page) {
  const username = process.env.ADMIN_SEED_USERNAME ?? "superadmin";
  const password = process.env.ADMIN_SEED_PASSWORD ?? "GantiSaya-Dev-2026";
  const res = await page.request.post("/api/v1/admin/login", { data: { username, password } });
  expect(res.status(), "login superadmin untuk e2e (jalankan npm run db:seed)").toBe(200);
}
