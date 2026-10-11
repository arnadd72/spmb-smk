import { createHash } from "node:crypto";
import { prisma } from "@/server/db/client";
import { hitungPeringkat, type BobotJurusanData, type BobotMapel, type HasilJurusan } from "@/server/validasi/peringkat";
import type { NilaiRapor } from "@/server/validasi/wizard";

// Rekomendasi jurusan: rata-rata tertimbang dari nilai rapor (PRD v3.1 Bagian 12). Rumus murni ada di
// validasi/peringkat.ts; di sini versi bobot dan pemuat bobot dari database.

export type { BobotJurusanData, BobotMapel, HasilJurusan, LabelRekomendasi, RincianMapel } from "@/server/validasi/peringkat";

export type HasilRekomendasi = { versi: string; peringkat: HasilJurusan[] };

/** Versi bobot: berubah bila bobot diubah, supaya skor lama tetap bisa ditelusuri (PRD 12.3). */
export function versiBobot(jurusan: BobotJurusanData[]): string {
  const kanonik = [...jurusan]
    .sort((a, b) => a.kode.localeCompare(b.kode))
    .map((j) => [j.kode, ...[...j.bobot].sort((a, b) => a.kode.localeCompare(b.kode)).map((m) => `${m.kode}:${m.bobot}`)].join("|"))
    .join(";");
  return `bobot-${createHash("sha256").update(kanonik).digest("hex").slice(0, 8)}`;
}

export function hitungRekomendasi(nilai: NilaiRapor, jurusan: BobotJurusanData[]): HasilRekomendasi {
  return { versi: versiBobot(jurusan), peringkat: hitungPeringkat(nilai, jurusan) };
}

/** Bobot jurusan aktif dari database. */
export async function muatBobotJurusan(): Promise<BobotJurusanData[]> {
  const baris = await prisma.jurusan.findMany({
    where: { isActive: true },
    orderBy: { urutan: "asc" },
    include: { bobot: { include: { mataPelajaran: true } } },
  });
  return baris.map((j) => ({
    id: j.id.toString(),
    kode: j.kode,
    nama: j.nama,
    urutan: j.urutan,
    bobot: j.bobot
      .filter((b) => b.mataPelajaran.isActive)
      .map((b) => ({ kode: b.mataPelajaran.kode, nama: b.mataPelajaran.nama, bobot: Number(b.bobot) })),
  }));
}

/** Mapel yang punya bobot di jurusan mana pun (baris tabel nilai rapor). */
export function mapelBerbobot(jurusan: BobotJurusanData[]): BobotMapel[] {
  const peta = new Map<string, BobotMapel>();
  for (const j of jurusan) for (const m of j.bobot) if (!peta.has(m.kode)) peta.set(m.kode, m);
  return [...peta.values()];
}
