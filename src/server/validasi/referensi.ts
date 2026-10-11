import { z } from "zod";

// Data referensi akademik (PRD v3.1 13.9): bobot jurusan dan mata pelajaran. Satu skema untuk server dan form admin.

export const skemaBobot = z.object({
  bobot: z
    .record(
      z.string().min(1).max(30),
      z.coerce.number({ error: "Bobot harus berupa angka." }).min(0, "Bobot minimal 0.").max(1, "Bobot maksimal 1."),
    )
    .refine((b) => Object.values(b).some((v) => v > 0), "Isi minimal satu bobot lebih dari 0."),
});
export type InputBobot = z.infer<typeof skemaBobot>;

export const KELOMPOK_MAPEL = ["umum", "madrasah", "mulok"] as const;

export const skemaMapel = z.object({
  kode: z
    .string({ error: "Kode wajib diisi." })
    .trim()
    .regex(/^[a-z][a-z0-9_]{1,29}$/, "Kode 2-30 karakter: huruf kecil, angka, garis bawah; diawali huruf."),
  nama: z.string({ error: "Nama wajib diisi." }).trim().min(2, "Nama minimal 2 karakter.").max(120, "Nama maksimal 120 karakter."),
  alias: z
    .array(z.string().trim().min(1).max(80, "Setiap alias maksimal 80 karakter."))
    .max(30, "Maksimal 30 alias.")
    .default([])
    .transform((a) => [...new Set(a.map((x) => x.toLowerCase()))]),
  kelompok: z.enum(KELOMPOK_MAPEL, { error: "Kelompok tidak valid." }),
  urutan: z.coerce.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().default(true),
});
export type InputMapel = z.infer<typeof skemaMapel>;
