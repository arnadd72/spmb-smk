import { prisma } from "@/server/db/client";
import { VERSI_MINAT, peringkatMinat, type HasilMinat, type JawabanMinat, type JurusanUntukMinat } from "@/server/validasi/minat";

// Rekomendasi jurusan dari tes minat bakat langkah 3 (PRD 1.3 butir 65, menggantikan rumus nilai rapor PRD v3.1 Bagian 12).
// Rumus murni ada di validasi/minat.ts; di sini pemuat jurusan aktif dari database.

export type { HasilMinat, LabelMinat } from "@/server/validasi/minat";

export type HasilRekomendasi = { versi: string; peringkat: HasilMinat[] };

/** Jurusan aktif, urut tampil. */
export async function muatJurusanAktif(): Promise<JurusanUntukMinat[]> {
  const baris = await prisma.jurusan.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" }, select: { id: true, kode: true, nama: true, urutan: true } });
  return baris.map((j) => ({ ...j, id: j.id.toString() }));
}

export function hitungRekomendasi(jawaban: JawabanMinat | undefined, jurusan: JurusanUntukMinat[]): HasilRekomendasi {
  return { versi: VERSI_MINAT, peringkat: peringkatMinat(jawaban, jurusan) };
}
