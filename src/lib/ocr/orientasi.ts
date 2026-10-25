import type { BarisOcr } from "./tipe";

// Orientasi foto dokumen (PRD v4 11.2, poin F). Pendaftar sering memotret KK mendatar dengan HP tegak, sehingga dokumen
// terputar 90 derajat. Bila hasil baca pertama lemah, worker mencoba putaran lain dan memakai yang terkuat. Teks yang
// terbaca terbalik bisa tampak yakin ("HVNVOWVH"), jadi ukurannya memakai kata khas KK dan Akta, yang tidak pernah muncul
// dari teks terbalik. Murni (tanpa DOM) supaya bisa diuji.

/** Putaran yang dicoba berurutan bila hasil baca tegak lemah (90 dan 270 paling sering: foto mendatar di HP tegak). */
export const PUTARAN_CADANGAN = [90, 270, 180] as const;

const KATA_DOKUMEN = new Set([
  "kartu", "keluarga", "nama", "kepala", "alamat", "desa", "kelurahan", "kecamatan", "kabupaten", "kota", "provinsi",
  "lengkap", "nik", "jenis", "kelamin", "laki", "perempuan", "tempat", "tanggal", "lahir", "agama", "islam", "kristen",
  "pendidikan", "pekerjaan", "status", "perkawinan", "kawin", "belum", "hubungan", "anak", "istri", "isteri", "wni",
  "ayah", "ibu", "akta", "kelahiran", "kutipan", "pencatatan", "sipil", "warga", "negara", "indonesia", "bahwa", "telah",
  "tahun", "dari", "dan", "pada", "dikeluarkan", "sekolah", "belum", "tidak", "orang", "tua",
]);

const yakin = (b: BarisOcr) => b.skor >= 0.8 && b.teks.replace(/[^A-Za-z0-9]/g, "").length >= 3;

/** Banyaknya kata khas KK/Akta pada potongan yang terbaca yakin. */
function kataDokumen(baris: BarisOcr[]): number {
  return baris.filter(yakin).reduce((n, b) => n + b.teks.toLowerCase().split(/[^a-z]+/).filter((w) => KATA_DOKUMEN.has(w)).length, 0);
}

/** Ukuran seberapa kuat hasil baca: huruf/angka yang terbaca yakin (maks 40 per potongan), ditambah bobot kata khas dokumen. */
export function kekuatanBaca(baris: BarisOcr[]): number {
  const isi = baris.filter(yakin).reduce((n, b) => n + Math.min(40, b.teks.replace(/[^A-Za-z0-9]/g, "").length) * b.skor, 0);
  return isi + 25 * kataDokumen(baris);
}

/** Hasil baca lemah: kurang dari 12 potongan yakin, atau kurang dari 3 kata khas dokumen (kemungkinan terbalik). */
export function bacaanLemah(baris: BarisOcr[]): boolean {
  return baris.filter(yakin).length < 12 || kataDokumen(baris) < 3;
}
