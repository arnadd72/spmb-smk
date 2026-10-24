import { prisma } from "@/server/db/client";
import { GalatApi } from "@/server/types/galat";

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

type KlienDb = Pick<typeof prisma, "pendaftar" | "jurusan">;

/**
 * Tolak pilihan jurusan yang kuotanya sudah penuh (PRD 1.3 butir 62: pendaftar langsung diterima, jadi kuota harus ditegakkan
 * saat mendaftar). Jurusan terbuka lagi begitu admin menaikkan kuotanya. Dipanggil saat menyimpan langkah jurusan dan di dalam
 * transaksi submit, sesudah kunci advisory nomor dipegang, supaya dua kiriman bersamaan tidak melewati kuota.
 */
export async function pastikanKuotaTersedia(db: KlienDb, periode: string, jurusanId: bigint): Promise<void> {
  const j = await db.jurusan.findUnique({ where: { id: jurusanId }, select: { kode: true, kuota: true } });
  if (!j) return;
  const terisi = await db.pendaftar.count({ where: { periode, jurusan1Id: jurusanId, statusVerifikasi: { not: "rejected" } } });
  if (terisi >= j.kuota) {
    throw new GalatApi(409, "KUOTA_PENUH", `Kuota jurusan ${j.kode} sudah penuh. Pilih jurusan lain atau hubungi panitia.`, {
      jurusan_1: [`Kuota jurusan ${j.kode} sudah penuh. Pilih jurusan lain.`],
    });
  }
}
