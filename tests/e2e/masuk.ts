import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
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

/** Sisipkan pendaftar minimal langsung ke database dev (nama diawali "Uji E2E Peserta", dihapus global-teardown). */
const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

export async function sisipPendaftar(nama: string, opsi: { status?: string; asalSekolah?: string; berkas?: boolean } = {}) {
  const nomor = `E2E-${randomBytes(4).toString("hex").toUpperCase()}`;
  // Berkas uji ditulis ke penyimpanan sementara lokal (sama dengan yang dipakai dev server) dan dihapus global-teardown.
  let meta: string | null = null;
  if (opsi.berkas) {
    const ref = `e2e/${nomor}/akta.png`;
    const lokasi = path.join(process.cwd(), ".local", "draf-temp", ref);
    mkdirSync(path.dirname(lokasi), { recursive: true });
    writeFileSync(lokasi, PNG_1X1);
    meta = JSON.stringify({ akta: { ref, nama: "akta.png", mime: "image/png", ukuran: PNG_1X1.length } });
  }
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const r = await db.query(
      `INSERT INTO "Pendaftar"("nomorPendaftaran","aksesTokenHash","periode","namaLengkap","asalSekolah","statusVerifikasi",
        "nilaiRapor","nilaiRaporSumber","rekomendasiSkor","rekomendasiVersi","tanggalLahir","nisn","berkasMeta","updatedAt")
       VALUES ($1,$2,'2027/2028',$3,$4,$5::"StatusVerifikasi",$6,'manual','[]','uji','2011-05-17','1234567890',$7,now()) RETURNING id`,
      [nomor, randomBytes(16).toString("hex"), nama, opsi.asalSekolah ?? "SMP Uji", opsi.status ?? "pending", JSON.stringify({ semester: [1, 2, 3, 4, 5], mapel: { matematika: { "1": 80 } } }), meta],
    );
    return { id: String(r.rows[0].id), nomor };
  } finally {
    await db.end();
  }
}
