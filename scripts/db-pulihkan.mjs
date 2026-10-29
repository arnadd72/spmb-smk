// Pulihkan cadangan dari scripts/db-backup.mjs ke database KOSONG yang skemanya sudah dibuat (`prisma migrate deploy`).
// Pemakaian: node scripts/db-pulihkan.mjs <folder-cadangan> <alamat-database-tujuan>
// Pengaman: tujuan harus Postgres lokal (localhost). Memulihkan ke Supabase harus dilakukan sadar dengan --izinkan-jauh.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import pg from "pg";

const [folderArg, url, ...opsi] = process.argv.slice(2);
if (!folderArg || !url) {
  console.error("Pemakaian: node scripts/db-pulihkan.mjs <folder-cadangan> <alamat-database-tujuan> [--timpa] [--izinkan-jauh]");
  process.exit(1);
}
const lokal = /^postgres(ql)?:\/\/[^@]+@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
if (!lokal && !opsi.includes("--izinkan-jauh")) {
  console.error("Ditolak: tujuan bukan Postgres lokal. Tambahkan --izinkan-jauh hanya bila memang sengaja memulihkan ke database jauh.");
  process.exit(1);
}

const folder = resolve(folderArg);
const manifestPath = join(folder, "_manifest.json");
if (!existsSync(manifestPath)) {
  console.error("Folder bukan cadangan yang sah (tidak ada _manifest.json).");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const db = new pg.Client({ connectionString: url, ssl: lokal ? false : { rejectUnauthorized: false } });
await db.connect();

try {
  const tabel = Object.keys(manifest.jumlahBaris);
  const data = Object.fromEntries(tabel.map((t) => [t, JSON.parse(gunzipSync(readFileSync(join(folder, `${t}.json.gz`))).toString("utf8"))]));

  // Tujuan harus kosong, kecuali isi bawaan dari migrasi (mis. 15 soal tes minat bakat): dengan --timpa, tabel yang sudah
  // berisi dikosongkan dulu (TRUNCATE) lalu diisi dari cadangan. Tanpa --timpa, pemulihan tidak menimpa data apa pun.
  const terisi = [];
  for (const t of tabel) {
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM "${t}"`);
    if (rows[0].n > 0) terisi.push(`${t} (${rows[0].n})`);
  }
  if (terisi.length > 0) {
    if (!opsi.includes("--timpa")) {
      throw new Error(`Tujuan tidak kosong: ${terisi.join(", ")}. Bila itu hanya isi bawaan migrasi dan boleh ditimpa, ulangi dengan --timpa.`);
    }
    const daftar = terisi.map((x) => `"${x.split(" ")[0]}"`).join(", ");
    await db.query(`TRUNCATE ${daftar} RESTART IDENTITY CASCADE`);
    console.log(`Dikosongkan sebelum pemulihan: ${terisi.join(", ")}`);
  }

  // Urutan mengikuti kunci asing: tabel yang gagal karena induknya belum ada diulang di putaran berikutnya.
  let sisa = tabel.filter((t) => data[t].length > 0);
  for (let putaran = 1; sisa.length > 0; putaran++) {
    const gagal = [];
    let kemajuan = 0;
    for (const t of sisa) {
      try {
        await db.query("BEGIN");
        for (const baris of data[t]) {
          await db.query(`INSERT INTO "${t}" SELECT * FROM jsonb_populate_record(NULL::"${t}", $1::jsonb)`, [JSON.stringify(baris)]);
        }
        await db.query("COMMIT");
        kemajuan++;
      } catch (e) {
        await db.query("ROLLBACK");
        if (!/foreign key/i.test(e.message)) throw new Error(`Tabel ${t}: ${e.message}`);
        gagal.push(t);
      }
    }
    if (kemajuan === 0) throw new Error(`Kunci asing tidak terpenuhi untuk tabel: ${gagal.join(", ")}`);
    sisa = gagal;
    if (putaran > 20) throw new Error("Terlalu banyak putaran pemulihan.");
  }

  // Samakan penghitung id otomatis dengan data yang masuk.
  const { rows: urutan } = await db.query(
    `SELECT c.table_name AS tabel, c.column_name AS kolom FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND pg_get_serial_sequence('"' || c.table_name || '"', c.column_name) IS NOT NULL`,
  );
  for (const { tabel: t, kolom } of urutan) {
    await db.query(`SELECT setval(pg_get_serial_sequence('"${t}"', '${kolom}'), COALESCE((SELECT MAX("${kolom}") FROM "${t}"), 1), (SELECT MAX("${kolom}") IS NOT NULL FROM "${t}"))`);
  }

  // Verifikasi jumlah baris.
  let cocok = true;
  for (const t of tabel) {
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM "${t}"`);
    if (rows[0].n !== manifest.jumlahBaris[t]) {
      cocok = false;
      console.error(`  TIDAK COCOK ${t}: cadangan ${manifest.jumlahBaris[t]}, tujuan ${rows[0].n}`);
    }
  }
  const total = Object.values(manifest.jumlahBaris).reduce((a, b) => a + b, 0);
  console.log(cocok ? `Pemulihan selesai dan cocok: ${tabel.length} tabel, ${total} baris.` : "Pemulihan selesai tetapi ada jumlah yang tidak cocok.");
  process.exitCode = cocok ? 0 : 1;
} catch (e) {
  console.error("Pemulihan gagal:", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
