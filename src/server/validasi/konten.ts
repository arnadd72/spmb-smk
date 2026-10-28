import { z } from "zod";

// Skema validasi konten admin (PRD v3.1 13.8, 13.9, 13.10). Satu skema dipakai server dan form klien.

const teks = (label: string, min = 1, max = 255) =>
  z.string({ error: `${label} wajib diisi.` }).trim().min(min, `${label} wajib diisi.`).max(max, `${label} maksimal ${max} karakter.`);

const teksOpsional = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .nullish()
    .transform((v) => (v ? v : null));

/** Path situs ("/images/...") atau URL https. Menolak skema berbahaya seperti javascript:. */
const gambar = z
  .string()
  .trim()
  .max(500, "Alamat gambar terlalu panjang.")
  .refine((v) => v === "" || v.startsWith("/") || v.startsWith("https://"), "Alamat gambar harus diawali / atau https://")
  .nullish()
  .transform((v) => (v ? v : null));

const urutan = z.coerce.number().int("Urutan harus bilangan bulat.").min(0).max(10000).default(0);
const aktif = z.boolean().default(true);

export const skemaBerita = z.object({
  judul: teks("Judul", 3, 200),
  isi: teks("Isi berita", 1, 50000),
  gambar,
  isActive: aktif,
  publishedAt: z.coerce.date().nullish().transform((v) => v ?? null),
});

export const skemaEvent = z.object({
  judul: teks("Judul", 3, 200),
  deskripsi: teksOpsional(5000),
  tanggal: z.coerce.date({ error: "Tanggal tidak valid." }),
  lokasi: teksOpsional(200),
  gambar,
  isActive: aktif,
});

/** Foto tambahan hero beranda: bentuknya sama dengan galeri. */
export const skemaFotoHero = z.object({
  judul: teksOpsional(200),
  gambar: z
    .string()
    .trim()
    .min(1, "Gambar wajib diisi.")
    .max(500)
    .refine((v) => v.startsWith("/") || v.startsWith("https://"), "Alamat gambar harus diawali / atau https://"),
  urutan,
  isActive: aktif,
});

export const skemaGaleri = z.object({
  judul: teksOpsional(200),
  gambar: z
    .string()
    .trim()
    .min(1, "Gambar wajib diisi.")
    .max(500)
    .refine((v) => v.startsWith("/") || v.startsWith("https://"), "Alamat gambar harus diawali / atau https://"),
  urutan,
  isActive: aktif,
});

export const skemaTestimoni = z.object({
  nama: teks("Nama", 2, 120),
  keterangan: teksOpsional(200),
  isi: teks("Isi testimoni", 5, 600),
  foto: gambar,
  urutan,
  isActive: aktif,
});

/** Kata kunci boleh berupa array atau teks dipisah koma (PRD 13.8). */
const keywords = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : v.split(",")).map((k) => k.trim().toLowerCase()).filter(Boolean))
  .pipe(z.array(z.string().max(60)).max(40, "Maksimal 40 kata kunci."));

export const skemaFaq = z.object({
  pertanyaan: teks("Pertanyaan", 5, 300),
  jawaban: teks("Jawaban", 2, 5000),
  keywords,
  kategori: teksOpsional(60),
  urutan,
  isActive: aktif,
});

/** Soal tes minat bakat (PRD 1.3 butir 80): satu pilihan per jurusan, A = MPLB, B = AKL, C = LPK3, D = TKR. */
export const skemaSoalMinat = z.object({
  pertanyaan: teks("Pertanyaan", 5, 300),
  opsiMplb: teks("Pilihan A", 2, 300),
  opsiAkl: teks("Pilihan B", 2, 300),
  opsiLpk3: teks("Pilihan C", 2, 300),
  opsiTkr: teks("Pilihan D", 2, 300),
  urutan,
  isActive: aktif,
});

const daftarTeks = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : v.split("\n")).map((k) => k.trim()).filter(Boolean))
  .pipe(z.array(z.string().max(160)).max(20));

/** Kode jurusan tidak bisa diubah (dipakai di URL dan tes minat bakat). */
export const skemaJurusan = z.object({
  nama: teks("Nama jurusan", 3, 150),
  deskripsi: teksOpsional(3000),
  prospekKarir: daftarTeks,
  keunggulan: daftarTeks,
  kuota: z.coerce.number().int("Kuota harus bilangan bulat.").min(0, "Kuota minimal 0.").max(1000, "Kuota maksimal 1000."),
  gambar,
  urutan,
  isActive: aktif,
});

// Pengaturan: hanya kunci yang dikenal, masing-masing dengan aturan sendiri.
const tanggalOpsional = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Tanggal tidak valid (format tahun-bulan-tanggal).");

export const SKEMA_PENGATURAN = {
  tahun_ajaran: z.string().trim().regex(/^\d{4}\/\d{4}$/, "Format tahun ajaran harus 2027/2028."),
  gelombang_buka: tanggalOpsional,
  gelombang_tutup: tanggalOpsional,
  tanggal_verifikasi_fisik: tanggalOpsional,
  kontak_panitia: z.string().trim().max(300),
  teks_persyaratan: z.string().trim().max(10000),
  teks_persetujuan: z.string().trim().max(10000),
  wa_group_url: z
    .string()
    .trim()
    .refine((v) => v === "" || v.startsWith("https://"), "Tautan harus diawali https://"),
} as const;

export type KunciPengaturan = keyof typeof SKEMA_PENGATURAN;
export const KUNCI_PENGATURAN = Object.keys(SKEMA_PENGATURAN) as KunciPengaturan[];

export const skemaPengaturan = z
  .object(
    Object.fromEntries(KUNCI_PENGATURAN.map((k) => [k, SKEMA_PENGATURAN[k].optional()])) as {
      [K in KunciPengaturan]: z.ZodOptional<(typeof SKEMA_PENGATURAN)[K]>;
    },
  )
  .strict();
