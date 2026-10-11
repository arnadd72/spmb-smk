import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { ambilKonfigWizard } from "@/server/services/draf";
import { terdaftarPerJurusan } from "@/server/services/kuota";
import { GalatApi } from "@/server/types/galat";
import { skemaKuota } from "@/server/validasi/kuota";
import type { KonteksAksi } from "./konten";

export type BarisKuota = { kode: string; nama: string; kuota: number; terdaftar: number; sisa: number; persen: number };

export async function ambilKuota(): Promise<{ periode: string; baris: BarisKuota[] }> {
  const periode = (await ambilKonfigWizard()).tahunAjaran;
  const [jurusan, terpakai] = await Promise.all([
    prisma.jurusan.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" } }),
    terdaftarPerJurusan(periode),
  ]);
  return {
    periode,
    baris: jurusan.map((j) => {
      const terdaftar = terpakai.get(String(j.id)) ?? 0;
      return {
        kode: j.kode,
        nama: j.nama,
        kuota: j.kuota,
        terdaftar,
        sisa: Math.max(0, j.kuota - terdaftar),
        persen: j.kuota > 0 ? Math.round((terdaftar / j.kuota) * 100) : 0,
      };
    }),
  };
}

/** Simpan massal dalam satu transaksi: semua berhasil atau tidak ada yang berubah. */
export async function simpanKuota(mentah: unknown, ctx: KonteksAksi) {
  const { kuota } = skemaKuota.parse(mentah);
  const jurusan = await prisma.jurusan.findMany({ where: { isActive: true } });
  const dikenal = new Map(jurusan.map((j) => [j.kode, j]));

  const asing = Object.keys(kuota).filter((k) => !dikenal.has(k));
  if (asing.length > 0) throw GalatApi.validasi({ kuota: [`Jurusan tidak dikenal: ${asing.join(", ")}.`] });

  const dataLama: Record<string, number> = {};
  const dataBaru: Record<string, number> = {};
  await prisma.$transaction(async (tx) => {
    for (const [kode, nilai] of Object.entries(kuota)) {
      const j = dikenal.get(kode)!;
      if (j.kuota === nilai) continue;
      await tx.jurusan.update({ where: { id: j.id }, data: { kuota: nilai } });
      dataLama[kode] = j.kuota;
      dataBaru[kode] = nilai;
    }
  });

  if (Object.keys(dataBaru).length > 0) {
    await catatAudit({ userId: ctx.userId, aksi: "kuota.ubah", entitasTipe: "jurusan", dataLama, dataBaru, ip: ctx.ip });
  }
  return { berubah: Object.keys(dataBaru) };
}
