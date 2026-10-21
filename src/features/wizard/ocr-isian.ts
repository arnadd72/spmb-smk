import type { FieldOcr, HasilParser } from "@/lib/ocr/tipe";

// Penggabungan saran isian dari Akta dan KK (PRD v4 11.3). Murni (tanpa React) supaya mudah diuji.

/** Isian yang bersumber dari Akta (Akta lebih dipercaya untuk data kelahiran dan nama orang tua). */
export const KUNCI_AKTA = ["tempat_lahir", "jenis_kelamin", "nama_ayah", "nama_ibu"] as const;
/** Isian yang bersumber dari KK. Nama orang tua dari KK hanya cadangan bila Akta tidak memberinya. */
export const KUNCI_KK = ["no_kk", "nik", "alamat", "rt", "rw", "desa", "kecamatan", "kabupaten", "propinsi"] as const;

export const LABEL_ISIAN_OCR: Record<string, string> = {
  tempat_lahir: "Tempat lahir",
  jenis_kelamin: "Jenis kelamin",
  nama_ayah: "Nama ayah",
  nama_ibu: "Nama ibu",
  no_kk: "Nomor Kartu Keluarga",
  nik: "NIK calon siswa",
  alamat: "Alamat",
  rt: "RT",
  rw: "RW",
  desa: "Desa atau kelurahan",
  kecamatan: "Kecamatan",
  kabupaten: "Kabupaten atau kota",
  propinsi: "Provinsi",
};

/** Contoh isian di bawah kolom, sebagai acuan saat siswa mengisi manual. */
export const CONTOH_ISIAN_OCR: Record<string, string> = {
  tempat_lahir: "Kota atau kabupaten kelahiran sesuai Akta. Contoh: BANYUMAS",
  jenis_kelamin: "Pilih sesuai Akta.",
  nama_ayah: "Nama lengkap sesuai Akta. Contoh: SUPRIYADI",
  nama_ibu: "Nama lengkap sesuai Akta. Contoh: SITI AMINAH",
  no_kk: "16 angka di bagian atas KK. Contoh: 3302010406080001",
  nik: "16 angka milik calon siswa. Contoh: 3302010903100002",
  alamat: "Nama jalan atau dusun, tanpa RT/RW. Contoh: DUSUN SIDAURIP",
  rt: "Contoh: 003",
  rw: "Contoh: 002",
  desa: "Contoh: SIDAURIP",
  kecamatan: "Contoh: WANGON",
  kabupaten: "Contoh: BANYUMAS",
  propinsi: "Contoh: JAWA TENGAH",
};

export const OPSI_JENIS_KELAMIN = [
  { nilai: "L", label: "Laki-laki" },
  { nilai: "P", label: "Perempuan" },
];

export type Saran = Record<string, FieldOcr>;

const terisi = (f: FieldOcr | undefined): f is FieldOcr => Boolean(f && f.nilai);

/**
 * Gabungkan hasil Akta dan KK. Kunci khas Akta diambil dari Akta, kunci khas KK dari KK;
 * nama ayah dan ibu dari KK dipakai hanya bila Akta tidak terbaca. Hanya field yang terisi yang dikembalikan.
 */
export function gabungSaran(akta?: HasilParser, kk?: HasilParser): Saran {
  const hasil: Saran = {};
  for (const k of KUNCI_KK) if (terisi(kk?.[k])) hasil[k] = kk![k];
  for (const k of ["nama_ayah", "nama_ibu"] as const) if (terisi(kk?.[k])) hasil[k] = kk![k];
  for (const k of KUNCI_AKTA) if (terisi(akta?.[k])) hasil[k] = akta![k];
  return hasil;
}

/** Nilai akhir yang dikirim ke server: suntingan pendaftar menang atas saran, kosong dibuang. */
export function nilaiAkhirOcr(saran: Saran, suntingan: Record<string, string>, awal: Record<string, string>): Record<string, string> {
  const hasil: Record<string, string> = {};
  const kunci = new Set([...Object.keys(saran), ...Object.keys(suntingan), ...Object.keys(awal)]);
  for (const k of kunci) {
    const v = (suntingan[k] ?? saran[k]?.nilai ?? awal[k] ?? "").trim();
    if (v) hasil[k] = v;
  }
  return hasil;
}
