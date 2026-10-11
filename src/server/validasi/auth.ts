import { z } from "zod";

export const skemaLogin = z.object({
  username: z.string().trim().min(1, "Username wajib diisi.").max(100),
  password: z.string().min(1, "Password wajib diisi.").max(200),
});

export type InputLogin = z.infer<typeof skemaLogin>;

/** Kebijakan password baru: minimal 10 karakter, ada huruf dan angka. */
const passwordBaru = z
  .string({ error: "Password baru wajib diisi." })
  .min(10, "Password minimal 10 karakter.")
  .max(200, "Password terlalu panjang.")
  .regex(/[A-Za-z]/, "Password harus memuat huruf.")
  .regex(/\d/, "Password harus memuat angka.");

export const skemaGantiPassword = z
  .object({
    passwordLama: z.string().min(1, "Password lama wajib diisi.").max(200),
    passwordBaru,
    konfirmasi: z.string().min(1, "Ulangi password baru."),
  })
  .refine((v) => v.passwordBaru === v.konfirmasi, { path: ["konfirmasi"], message: "Konfirmasi tidak sama dengan password baru." })
  .refine((v) => v.passwordBaru !== v.passwordLama, { path: ["passwordBaru"], message: "Password baru harus berbeda dari password lama." });

export type InputGantiPassword = z.infer<typeof skemaGantiPassword>;
