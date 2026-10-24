import { prisma } from "@/server/db/client";

export type JurusanRingkas = { kode: string; nama: string; kuota: number; isActive: boolean };

/** Semua jurusan (urut sesuai `urutan`). Bobot mata pelajaran tidak dipakai lagi sejak tes minat bakat (PRD 1.3 butir 65). */
export async function ambilJurusanRingkas(): Promise<JurusanRingkas[]> {
  const data = await prisma.jurusan.findMany({ orderBy: { urutan: "asc" } });
  return data.map((j) => ({ kode: j.kode, nama: j.nama, kuota: j.kuota, isActive: j.isActive }));
}
