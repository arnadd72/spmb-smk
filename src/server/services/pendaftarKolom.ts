import { dekripsi, enkripsi, hashPencarian } from "@/server/services/kripto";

// Pemetaan isian formulir (kunci snake_case dari form builder) ke kolom tabel Pendaftar. Dipakai submit wizard,
// edit admin, dan input manual agar aturan enkripsi dan hash pencarian satu tempat.

/** Kolom Pendaftar yang boleh diisi dari field formulir. Kunci lain (kustom_*) masuk dataKustom. */
export const KOLOM_DIKENAL = new Set([
  "nama_lengkap", "tempat_lahir", "tanggal_lahir", "nisn", "nik", "no_kk", "jenis_kelamin", "agama", "anak_ke",
  "jumlah_saudara", "asal_sekolah", "tamat_tahun", "no_ijazah", "no_hp", "no_wa", "email", "alamat", "rt", "rw",
  "desa", "kecamatan", "kabupaten", "propinsi", "nama_ayah", "ayah_ttl", "ayah_pendidikan", "pekerjaan_ayah",
  "nama_ibu", "ibu_ttl", "ibu_pendidikan", "pekerjaan_ibu", "alamat_ortu", "ortu_rt", "ortu_rw", "ortu_desa",
  "ortu_kecamatan", "ortu_kabupaten", "ortu_propinsi", "no_hp_ortu", "penghasilan", "referensi_pendaftar",
  "smp_kecamatan", "smp_kabupaten", "smp_propinsi", "ijazah_nomor_tahun", "lama_belajar", "nilai_ujian",
  "golongan_darah", "tinggi_badan", "berat_badan", "penyakit_pernah_diderita", "hobi_olahraga", "hobi_kesenian",
  "hobi_organisasi", "hobi_prestasi", "hobi_lain", "ukuran_seragam",
]);
export const KOLOM_TERENKRIPSI = new Set(["nik", "no_kk", "no_hp", "no_wa", "no_hp_ortu"]);
/** Field yang tidak masuk kolom: ditangani terpisah. */
export const KUNCI_DILEWATI = new Set(["setuju", "konfirmasi_final", "jurusan_1", "jurusan_2", "nilai_rapor"]);

export const camel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** Nomor telepon kanonik "08..." (buang spasi dan tanda, +62/62 diganti 0) untuk hash pencarian dan tautan. */
export function normalisasiHp(v: string): string {
  const digit = v.replace(/\D/g, "");
  return digit.startsWith("62") ? `0${digit.slice(2)}` : digit;
}

/** Nomor internasional tanpa plus untuk tautan wa.me: 0812... -> 62812... */
export function nomorWa(v: string): string {
  const k = normalisasiHp(v);
  return k.startsWith("0") ? `62${k.slice(1)}` : k;
}

export function susunKolom(semua: Record<string, unknown>): { kolom: Record<string, unknown>; kustom: Record<string, unknown> } {
  const kolom: Record<string, unknown> = {};
  const kustom: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(semua)) {
    if (KUNCI_DILEWATI.has(k) || v === undefined) continue;
    if (!KOLOM_DIKENAL.has(k)) {
      kustom[k] = v;
      continue;
    }
    if (k === "tanggal_lahir") kolom[camel(k)] = new Date(`${v}T00:00:00Z`);
    else if (KOLOM_TERENKRIPSI.has(k)) kolom[camel(k)] = enkripsi(String(v));
    else kolom[camel(k)] = typeof v === "number" || typeof v === "object" ? v : String(v);
  }
  if (typeof semua.nik === "string") kolom.nikHash = hashPencarian(semua.nik);
  if (typeof semua.no_hp === "string") kolom.noHpHash = hashPencarian(normalisasiHp(semua.no_hp));
  return { kolom, kustom };
}

/** Samarkan nomor panjang: tampil 4 digit awal dan 4 digit akhir. */
export function samarkan(v: string | null | undefined, awal = 4, akhir = 4): string {
  if (!v) return "";
  if (v.length <= awal + akhir) return "•".repeat(v.length);
  return `${v.slice(0, awal)}${"•".repeat(v.length - awal - akhir)}${v.slice(-akhir)}`;
}

/** Dekripsi aman: nilai kosong atau rusak jadi null. */
export function bukaAman(v: string | null | undefined): string | null {
  if (!v) return null;
  try {
    return dekripsi(v);
  } catch {
    return null;
  }
}
