import { prisma } from "@/server/db/client";
import { jsonPublik } from "../../_lib/publik";
import { tangani } from "../../_lib/tangani";

/** Mata pelajaran aktif yang dipakai tabel nilai rapor dan saran jurusan. Alias OCR tidak dikirim. */
export const GET = tangani(async () => {
  const data = await prisma.mataPelajaran.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" } });
  return jsonPublik({ data: data.map((m) => ({ kode: m.kode, nama: m.nama, kelompok: m.kelompok })) });
});
