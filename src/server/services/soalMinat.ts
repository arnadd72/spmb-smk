import { prisma } from "@/server/db/client";
import { JURUSAN_MINAT, type SoalMinat } from "@/server/validasi/minat";

// Pemuat soal tes minat bakat dari database (PRD 1.3 butir 80). Rumus dan skema ada di validasi/minat.ts.

/** Soal urut tampil. Secara bawaan hanya yang aktif; `semua` untuk panel admin. Baris yang pilihannya rusak dilewati. */
export async function muatSoalMinat(opsi: { semua?: boolean } = {}): Promise<SoalMinat[]> {
  const baris = await prisma.soalMinat.findMany({
    where: opsi.semua ? undefined : { isActive: true },
    orderBy: [{ urutan: "asc" }, { id: "asc" }],
  });
  return baris.flatMap((b) => {
    const pilihan = b.opsi;
    if (!Array.isArray(pilihan) || pilihan.length !== JURUSAN_MINAT.length || !pilihan.every((x) => typeof x === "string")) return [];
    return [{ id: b.id.toString(), urutan: b.urutan, teks: b.teks, opsi: pilihan as string[], isActive: b.isActive }];
  });
}
