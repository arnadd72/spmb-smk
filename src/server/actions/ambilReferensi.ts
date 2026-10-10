import { prisma } from "@/server/db/client";

export type JurusanDenganBobot = {
  kode: string;
  nama: string;
  kuota: number;
  bobot: { mapel: string; kode: string; bobot: number }[];
  totalBobot: number;
};

/** Jurusan aktif beserta bobot mata pelajarannya (urut sesuai `urutan`). */
export async function ambilJurusanDenganBobot(): Promise<JurusanDenganBobot[]> {
  const data = await prisma.jurusan.findMany({
    orderBy: { urutan: "asc" },
    include: { bobot: { include: { mataPelajaran: true }, orderBy: { bobot: "desc" } } },
  });

  return data.map((j) => {
    const bobot = j.bobot.map((b) => ({ mapel: b.mataPelajaran.nama, kode: b.mataPelajaran.kode, bobot: Number(b.bobot) }));
    return {
      kode: j.kode,
      nama: j.nama,
      kuota: j.kuota,
      bobot,
      totalBobot: Math.round(bobot.reduce((a, b) => a + b.bobot, 0) * 1000) / 1000,
    };
  });
}

export type MapelRingkas = { kode: string; nama: string; kelompok: string; alias: string[] };

export async function ambilMataPelajaran(): Promise<MapelRingkas[]> {
  const data = await prisma.mataPelajaran.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" } });
  return data.map((m) => ({ kode: m.kode, nama: m.nama, kelompok: m.kelompok, alias: m.alias as string[] }));
}
