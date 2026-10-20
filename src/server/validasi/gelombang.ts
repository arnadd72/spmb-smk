import { z } from "zod";

// Gelombang pendaftaran (PRD v4 1.3 butir 44). Tanggal YYYY-MM-DD (WIB); kuota kosong = tanpa batas.
const tanggal = z.string({ error: "Tanggal wajib diisi." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus berformat tahun-bulan-hari.");

export const skemaGelombang = z
  .object({
    nama: z.string({ error: "Nama gelombang wajib diisi." }).trim().min(1, "Nama gelombang wajib diisi.").max(60, "Nama maksimal 60 karakter."),
    buka: tanggal,
    tutup: tanggal,
    kuota: z
      .union([z.literal(""), z.null(), z.coerce.number({ error: "Kuota harus berupa angka." }).int("Kuota harus bilangan bulat.").min(1, "Kuota minimal 1.").max(5000, "Kuota maksimal 5000.")])
      .optional()
      .transform((v) => (v === "" || v === null || v === undefined ? null : v)),
    isActive: z.boolean().default(true),
  })
  .refine((d) => d.tutup >= d.buka, { path: ["tutup"], message: "Tanggal tutup tidak boleh sebelum tanggal buka." });

export type InputGelombang = z.infer<typeof skemaGelombang>;
