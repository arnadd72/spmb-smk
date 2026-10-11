import { prisma } from "@/server/db/client";

/**
 * Jumlah pendaftar yang menempati kuota tiap jurusan (pilihan 1, periode berjalan). Yang ditolak tidak
 * menghitung. Satu definisi dipakai dashboard, halaman kuota, dan info kuota penuh di wizard.
 */
export async function terdaftarPerJurusan(periode: string): Promise<Map<string, number>> {
  const baris = await prisma.pendaftar.groupBy({
    by: ["jurusan1Id"],
    where: { periode, jurusan1Id: { not: null }, statusVerifikasi: { not: "rejected" } },
    _count: { _all: true },
  });
  return new Map(baris.map((b) => [String(b.jurusan1Id), b._count._all]));
}
