import { z } from "zod";

// Akun admin (PRD v3.1 13): dikelola superadmin. Password sementara dibuat server, tidak pernah dipilih admin lain.

export const PERAN_AKUN = ["superadmin", "panitia", "konten"] as const;
/** Peran yang boleh dipilih untuk akun baru: superadmin hanya satu akun (PRD 1.3 butir 81) dan tidak bisa ditambah. */
export const PERAN_AKUN_BARU = ["panitia", "konten"] as const;

export const skemaAkunBaru = z.object({
  nama: z.string({ error: "Nama wajib diisi." }).trim().min(2, "Nama minimal 2 karakter.").max(100, "Nama maksimal 100 karakter."),
  username: z
    .string({ error: "Username wajib diisi." })
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,30}$/, "Username 3-30 karakter: huruf kecil, angka, titik, garis bawah, atau strip."),
  peran: z.enum(PERAN_AKUN_BARU, { error: "Peran harus Panitia atau Operator konten. Superadmin hanya satu akun dan tidak bisa ditambah." }),
});
export type InputAkunBaru = z.infer<typeof skemaAkunBaru>;

export const skemaUbahAkun = z
  .object({
    nama: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100, "Nama maksimal 100 karakter.").optional(),
    peran: z.enum(PERAN_AKUN, { error: "Peran tidak valid." }).optional(),
    isActive: z.boolean().optional(),
    resetPassword: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Tidak ada perubahan yang dikirim.");
export type InputUbahAkun = z.infer<typeof skemaUbahAkun>;

export const skemaHapusAkun = z.object({
  password: z.string({ error: "Password wajib diisi." }).min(1, "Password wajib diisi.").max(200, "Password terlalu panjang."),
});
