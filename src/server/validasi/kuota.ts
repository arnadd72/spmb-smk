import { z } from "zod";

// Kuota per jurusan (PRD v3.1 13.6): kode jurusan -> bilangan bulat 0 sampai 1000.
export const skemaKuota = z.object({
  kuota: z.record(
    z.string().min(1).max(20),
    z.coerce.number({ error: "Kuota harus berupa angka." }).int("Kuota harus bilangan bulat.").min(0, "Kuota minimal 0.").max(1000, "Kuota maksimal 1000."),
  ),
});
export type InputKuota = z.infer<typeof skemaKuota>;
