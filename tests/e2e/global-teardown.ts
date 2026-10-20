import "dotenv/config";
import { rmSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

// Hapus akun uji dan data uji e2e setelah seluruh pengujian selesai.
export default async function hapusDataUji() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query(
      `DELETE FROM "AuditLog" WHERE "entitasTipe" = 'pendaftar'
         AND "entitasId" IN (SELECT id::text FROM "Pendaftar" WHERE "namaLengkap" LIKE 'Uji E2E%')`,
    );
    await db.query(`DELETE FROM "Pendaftar" WHERE "namaLengkap" LIKE 'Uji E2E%'`);
    await db.query(`DELETE FROM "Gelombang" WHERE nama LIKE 'Uji E2E%'`);
    await db.query(`DELETE FROM "FormField" WHERE "isKustom" = true AND label LIKE 'Uji E2E%'`);
    await db.query(`DELETE FROM "MataPelajaran" WHERE kode LIKE 'uji_e2e%'`);
    await db.query(`DELETE FROM "AuditLog" WHERE "userId" IN (SELECT id FROM "User" WHERE username LIKE 'e2e-%' OR username LIKE 'uji-e2e-%')`);
    await db.query(`DELETE FROM "AuditLog" WHERE "entitasTipe" = 'user' AND "entitasId" IN (SELECT id::text FROM "User" WHERE username LIKE 'uji-e2e-%')`);
    await db.query(`DELETE FROM "User" WHERE username LIKE 'e2e-%' OR username LIKE 'uji-e2e-%'`);
    await db.query(`DELETE FROM "PercobaanLogin" WHERE username LIKE 'tanya:%' OR username LIKE 'tanyaai:%' OR username LIKE 'cek:%'`);
  } finally {
    await db.end();
    rmSync(path.join(process.cwd(), ".local", "draf-temp", "e2e"), { recursive: true, force: true });
  }
}
