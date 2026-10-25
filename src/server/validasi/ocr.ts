import { z } from "zod";

// Validasi hasil OCR dari browser (PRD v4 Bagian 11). OCR berjalan di perangkat pendaftar, jadi server tidak
// pernah memercayai hasilnya: nilai hanya saran yang disaring ulang di sini, dan field langkah 5 dan 6 tetap
// divalidasi lagi oleh skema form saat disimpan. Modul murni, tanpa akses database.

export const JENIS_OCR = ["akta", "kk"] as const;
export type JenisOcr = (typeof JENIS_OCR)[number];

const teksWajar = (maks = 255) => z.string().trim().min(1).max(maks);

/** Kunci isian yang boleh diisi dari Akta dan KK, mengikuti kunci field langkah 5 dan 6. */
const SKEMA_ISIAN_OCR: Record<string, z.ZodType<string>> = {
  tempat_lahir: teksWajar(),
  jenis_kelamin: z.enum(["L", "P"]),
  nama_ayah: teksWajar(),
  nama_ibu: teksWajar(),
  no_kk: z.string().regex(/^\d{16}$/),
  nik: z.string().regex(/^\d{16}$/),
  nik_ayah: z.string().regex(/^\d{16}$/),
  nik_ibu: z.string().regex(/^\d{16}$/),
  alamat: teksWajar(),
  rt: z.string().trim().regex(/^\d{1,3}$/),
  rw: z.string().trim().regex(/^\d{1,3}$/),
  desa: teksWajar(),
  kecamatan: teksWajar(),
  kabupaten: teksWajar(),
  propinsi: teksWajar(),
};

export const KUNCI_ISIAN_OCR = Object.keys(SKEMA_ISIAN_OCR);

/**
 * Isian angka pada kartu hasil baca: panjang maksimum, dan `tepat` bila panjangnya harus persis itu (NIK dan Nomor KK 16 digit).
 * Satu sumber untuk klien (menyaring ketikan dan menandai isian kurang) dan server (menolak isian yang lolos dari klien).
 */
export const ANGKA_OCR: Record<string, { panjang: number; tepat: boolean }> = {
  nik: { panjang: 16, tepat: true },
  nik_ayah: { panjang: 16, tepat: true },
  nik_ibu: { panjang: 16, tepat: true },
  no_kk: { panjang: 16, tepat: true },
  rt: { panjang: 3, tepat: false },
  rw: { panjang: 3, tepat: false },
};

/** Buang semua selain angka dan potong ke panjang maksimum untuk isian angka; isian lain dikembalikan apa adanya. */
export function saringAngkaOcr(kunci: string, nilai: string): string {
  const aturan = ANGKA_OCR[kunci];
  return aturan ? nilai.replace(/\D/g, "").slice(0, aturan.panjang) : nilai;
}

/** Galat isian angka yang tidak tepat (huruf, spasi, tanda, kurang, atau lebih). Isian kosong atau tidak dikirim bukan galat. */
export function galatAngkaOcr(input: unknown): Record<string, string[]> {
  const galat: Record<string, string[]> = {};
  if (!input || typeof input !== "object") return galat;
  for (const [kunci, aturan] of Object.entries(ANGKA_OCR)) {
    const nilai = (input as Record<string, unknown>)[kunci];
    if (nilai === undefined || nilai === null || nilai === "") continue;
    const sah = typeof nilai === "string" && (aturan.tepat ? new RegExp(`^\\d{${aturan.panjang}}$`) : new RegExp(`^\\d{1,${aturan.panjang}}$`)).test(nilai);
    if (!sah) galat[kunci] = [aturan.tepat ? `Harus tepat ${aturan.panjang} digit angka, tanpa huruf, spasi, atau tanda.` : `Harus 1 sampai ${aturan.panjang} digit angka.`];
  }
  return galat;
}

/** Saring isian hasil OCR: kunci tak dikenal dan nilai tak valid dibuang diam-diam (hanya saran, bukan data final). */
export function bersihkanIsianOcr(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const hasil: Record<string, string> = {};
  for (const [k, skema] of Object.entries(SKEMA_ISIAN_OCR)) {
    const mentah = (input as Record<string, unknown>)[k];
    if (typeof mentah !== "string") continue;
    const r = skema.safeParse(mentah);
    if (r.success) hasil[k] = r.data;
  }
  return hasil;
}

/** Catatan satu pembacaan untuk statistik. Nilai hasil bacaan sengaja tidak dikirim atau disimpan (data pribadi). */
export const skemaCatatOcr = z.object({
  jenis: z.enum(JENIS_OCR),
  sukses: z.boolean(),
  durasiMs: z.number().int().min(0).max(10 * 60_000),
  /** Per kunci field: keyakinan yang dilaporkan parser, tanpa nilainya. */
  keyakinan: z.record(z.string().max(40), z.enum(["HIGH", "MEDIUM", "LOW", "NOT_FOUND"])).default({}),
  galat: z.enum(["tidak_didukung", "waktu_habis", "gagal"]).optional(),
});
export type CatatOcr = z.infer<typeof skemaCatatOcr>;
