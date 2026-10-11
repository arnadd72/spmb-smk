import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

export type PeranUji = "superadmin" | "panitia" | "konten";

/**
 * Akun uji khusus e2e (username diawali "e2e-", password acak per akun, dihapus oleh global-teardown), supaya
 * akun superadmin asli tidak disentuh dan tidak terkena status wajib ganti password. Butuh database dev.
 */
export async function buatAkunUji(peran: PeranUji, opsi: { wajibGanti?: boolean } = {}) {
  const username = `e2e-${peran}-${randomBytes(4).toString("hex")}`;
  const password = `Uji${randomBytes(9).toString("hex")}9`;
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query(
      'INSERT INTO "User"(name, username, "passwordHash", peran, "mustChangePassword", "updatedAt") VALUES ($1,$2,$3,$4::"Peran",$5,now())',
      [`Uji ${peran}`, username, await bcrypt.hash(password, 4), peran, opsi.wajibGanti ?? false],
    );
  } finally {
    await db.end();
  }
  return { username, password };
}

export async function masukSebagai(page: Page, peran: PeranUji = "superadmin") {
  const { username, password } = await buatAkunUji(peran);
  const res = await page.request.post("/api/v1/admin/login", { data: { username, password } });
  expect(res.status(), `login akun uji ${peran}`).toBe(200);
  return { username, password };
}

export const masukSebagaiSuperadmin = (page: Page) => masukSebagai(page, "superadmin");
