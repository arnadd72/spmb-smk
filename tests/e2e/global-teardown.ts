import "dotenv/config";
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
    await db.query(`DELETE FROM "AuditLog" WHERE "userId" IN (SELECT id FROM "User" WHERE username LIKE 'e2e-%')`);
    await db.query(`DELETE FROM "User" WHERE username LIKE 'e2e-%'`);
  } finally {
    await db.end();
  }
}
