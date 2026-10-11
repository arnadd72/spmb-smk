import "dotenv/config";
import { Client } from "pg";

// Hapus semua akun uji e2e setelah seluruh pengujian selesai.
export default async function hapusAkunUji() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query('DELETE FROM "AuditLog" WHERE "userId" IN (SELECT id FROM "User" WHERE username LIKE \'e2e-%\')');
    await db.query('DELETE FROM "User" WHERE username LIKE \'e2e-%\'');
  } finally {
    await db.end();
  }
}
