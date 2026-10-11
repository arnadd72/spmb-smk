import { z } from "zod";

// Aksi verifikasi panitia (PRD v3.1 13.4). Dipakai server (otoritatif) dan form admin.

const catatan = (label: string) =>
  z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    .min(5, `${label} minimal 5 karakter.`)
    .max(1000, `${label} maksimal 1000 karakter.`);

export const skemaVerifikasi = z.discriminatedUnion("aksi", [
  z.object({ aksi: z.literal("setujui") }),
  z.object({ aksi: z.literal("revisi"), catatan: catatan("Catatan revisi") }),
  z.object({ aksi: z.literal("tolak"), catatan: catatan("Alasan penolakan") }),
]);
export type InputVerifikasi = z.infer<typeof skemaVerifikasi>;

const nilaiSel = z.union([z.string(), z.number()]).nullish();

export const skemaNilaiPanitia = z.discriminatedUnion("aksi", [
  z.object({ aksi: z.literal("sesuai") }),
  z.object({ aksi: z.literal("koreksi"), mapel: z.record(z.string(), z.record(z.string(), nilaiSel)) }),
]);
export type InputNilaiPanitia = z.infer<typeof skemaNilaiPanitia>;
