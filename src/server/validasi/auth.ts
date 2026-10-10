import { z } from "zod";

export const skemaLogin = z.object({
  username: z.string().trim().min(1, "Username wajib diisi.").max(100),
  password: z.string().min(1, "Password wajib diisi.").max(200),
});

export type InputLogin = z.infer<typeof skemaLogin>;
