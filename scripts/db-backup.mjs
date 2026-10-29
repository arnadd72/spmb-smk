// Cadangan data database (logis): setiap tabel disalin ke satu berkas JSON terkompresi, plus manifest berisi jumlah baris.
// Skema tidak ikut: skema selalu bisa dibuat ulang dari prisma/migrations (`prisma migrate deploy`), lalu data dipulihkan
// dengan scripts/db-pulihkan.mjs. Hanya membaca database (SELECT), tidak mengubah apa pun.
//
// Alamat database dibaca dari .env.backup (DIRECT_URL, disarankan Session pooler port 5432) atau variabel BACKUP_DATABASE_URL.
// Berkas keluaran memuat data pribadi: disimpan di luar folder proyek (BACKUP_DIR, bawaan ../backup-spmb), tidak pernah ke git.
// Kolom sensitif (NIK, no KK, no HP) tetap terenkripsi di cadangan; tanpa ENCRYPTION_KEY isinya tidak bisa dibaca, simpan kuncinya terpisah.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { gzipSync } from "node:zlib";
import dotenv from "dotenv";
import pg from "pg";

const akar = resolve(import.meta.dirname, "..");
dotenv.config({ path: join(akar, ".env.backup"), quiet: true });

const url = process.env.BACKUP_DATABASE_URL ?? process.env.DIRECT_URL;
if (!url) {
  console.error("Alamat database belum diisi. Buat berkas .env.backup berisi satu baris: DIRECT_URL=\"postgresql://...\" (Session pooler, port 5432).");
  process.exit(1);
}

const host = (() => {
  try {
    return new URL(url).host;
  } catch {
    return "(alamat tidak terbaca)";
  }
})();

const stempel = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const induk = resolve(process.env.BACKUP_DIR ?? join(akar, "..", "backup-spmb"));
const folder = join(induk, stempel);
mkdirSync(folder, { recursive: true });

const db = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(host) ? false : { rejectUnauthorized: false } });
await db.connect();
console.log(`Terhubung ke ${host}`);

try {
  // Satu transaksi baca-saja dengan snapshot yang sama, supaya semua tabel konsisten satu sama lain.
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const { rows: tabel } = await db.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' ORDER BY tablename`,
  );
  const migrasi = await db
    .query(`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`)
    .then((r) => r.rows.map((x) => x.migration_name))
    .catch(() => []);

  const jumlah = {};
  for (const { tablename } of tabel) {
    const { rows } = await db.query(`SELECT to_jsonb(t) AS baris FROM "${tablename}" t`);
    const data = rows.map((r) => r.baris);
    jumlah[tablename] = data.length;
    writeFileSync(join(folder, `${tablename}.json.gz`), gzipSync(JSON.stringify(data)));
  }
  await db.query("COMMIT");

  writeFileSync(
    join(folder, "_manifest.json"),
    JSON.stringify({ dibuat: new Date().toISOString(), host, jumlahBaris: jumlah, migrasi }, null, 2),
  );
  const total = Object.values(jumlah).reduce((a, b) => a + b, 0);
  console.log(`\nCadangan selesai: ${tabel.length} tabel, ${total} baris.\nTersimpan di: ${folder}`);
  for (const [t, n] of Object.entries(jumlah)) if (n > 0) console.log(`  ${t.padEnd(24)} ${n}`);
} catch (e) {
  await db.query("ROLLBACK").catch(() => undefined);
  console.error("Cadangan gagal:", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
