import { prisma } from "@/server/db/client";
import { BATAS_SOAL_MINAT, type SoalMinat } from "@/server/validasi/minat";

// Soal tes minat bakat yang tampil (PRD 1.3 butir 80): diatur admin di Isi Situs, urut sesuai `urutan`.

/** Soal aktif, urut tampil. Pilihan A sampai D sejajar JURUSAN_MINAT. */
export async function muatSoalMinat(): Promise<SoalMinat[]> {
  const baris = await prisma.soalMinat.findMany({
    where: { isActive: true },
    orderBy: [{ urutan: "asc" }, { id: "asc" }],
    take: BATAS_SOAL_MINAT,
  });
  return baris.map((s) => ({ teks: s.pertanyaan, opsi: [s.opsiMplb, s.opsiAkl, s.opsiLpk3, s.opsiTkr] }));
}
