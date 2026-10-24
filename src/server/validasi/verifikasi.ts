import { z } from "zod";

// Pemeriksaan nilai rapor oleh panitia: "nilai sesuai" atau koreksi sel. Dipakai server (otoritatif) dan panel nilai admin.

const nilaiSel = z.union([z.string(), z.number()]).nullish();

export const skemaNilaiPanitia = z.discriminatedUnion("aksi", [
  z.object({ aksi: z.literal("sesuai") }),
  z.object({ aksi: z.literal("koreksi"), mapel: z.record(z.string(), z.record(z.string(), nilaiSel)) }),
]);
export type InputNilaiPanitia = z.infer<typeof skemaNilaiPanitia>;
