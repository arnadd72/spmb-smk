import { z } from "zod";

// Hapus pendaftar permanen oleh superadmin. Dipakai server (otoritatif) dan halaman admin lewat schema-client.ts.

/** Batas pendaftar sekali operasi, agar salah klik tidak menghapus seluruh data. */
export const MAKS_HAPUS = 500;
/** Batas per permintaan: menghapus folder Drive satu per satu lambat, jadi halaman mengirim bertahap. */
export const MAKS_PER_PERMINTAAN = 10;

const idDigit = z.string().regex(/^\d{1,18}$/, "ID pendaftar tidak sah.");
const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus berformat TTTT-BB-HH.");
const periode = z.string().trim().min(1, "Periode wajib diisi.").max(20);
const nomorUrut = z.number({ error: "Nomor urut harus angka." }).int("Nomor urut harus bilangan bulat.").min(0).max(9999);

export const skemaPilihanHapus = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("manual"), ids: z.array(idDigit).min(1, "Pilih setidaknya satu pendaftar.").max(MAKS_HAPUS) }),
  z.object({ mode: z.literal("tanggal"), periode, dari: tanggal, sampai: tanggal }),
  z.object({ mode: z.literal("nomor"), periode, dari: nomorUrut, sampai: nomorUrut }),
]);

export const skemaHapus = z.object({
  ids: z.array(idDigit).min(1, "Pilih setidaknya satu pendaftar.").max(MAKS_PER_PERMINTAAN, `Maksimal ${MAKS_PER_PERMINTAAN} pendaftar per permintaan.`),
  password: z.string().min(1, "Password wajib diisi."),
});

export type PilihanHapus = z.infer<typeof skemaPilihanHapus>;
export type InputHapus = z.infer<typeof skemaHapus>;
