import { prisma } from "@/server/db/client";
import { ambilKonfigWizard } from "@/server/services/draf";
import { terdaftarPerJurusan } from "@/server/services/kuota";
import { statusDrive } from "@/server/services/penyimpanan/driveOAuth";

// Data dashboard admin (PRD v3.1 13.2) untuk periode (tahun ajaran) berjalan.

export type KartuJurusan = { kode: string; nama: string; kuota: number; terdaftar: number; persen: number; rekomendasi: number };
export type PendaftarTerbaru = { id: string; nomor: string; nama: string; status: string; jurusan: string | null; dikirim: Date };

export type DataDashboard = {
  periode: string;
  total: number;
  pending: number;
  approved: number;
  revisiAtauDitolak: number;
  nilaiBelumDicek: number;
  perJurusan: KartuJurusan[];
  perHari: { tanggal: string; jumlah: number }[];
  terbaru: PendaftarTerbaru[];
  peringatan: { nada: "bahaya" | "peringatan"; teks: string; href?: string }[];
};

const HARI_GRAFIK = 30;

/** YYYY-MM-DD dalam WIB untuk N hari ke belakang, urut lama ke baru. */
function daftarHari(n: number): string[] {
  const hari: string[] = [];
  for (let i = n - 1; i >= 0; i--) hari.push(new Date(Date.now() + 7 * 3600_000 - i * 86400_000).toISOString().slice(0, 10));
  return hari;
}

export async function ambilDashboard(): Promise<DataDashboard> {
  const konfig = await ambilKonfigWizard();
  const periode = konfig.tahunAjaran;
  const where = { periode };

  const [perStatus, nilaiBelumDicek, jurusan, terpakai, rekomendasi, perHariMentah, terbaru, gagal, menunggu, drive] = await Promise.all([
    prisma.pendaftar.groupBy({ by: ["statusVerifikasi"], where, _count: { _all: true } }),
    prisma.pendaftar.count({ where: { ...where, statusNilai: "belumDicek" } }),
    prisma.jurusan.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" } }),
    terdaftarPerJurusan(periode),
    prisma.pendaftar.groupBy({ by: ["rekomendasiJurusanId"], where, _count: { _all: true } }),
    prisma.$queryRaw<{ d: string; n: number }[]>`
      SELECT to_char((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS d, count(*)::int AS n
      FROM "Pendaftar"
      WHERE "periode" = ${periode} AND "createdAt" >= now() - interval '31 days'
      GROUP BY 1`,
    prisma.pendaftar.findMany({ where, orderBy: { createdAt: "desc" }, take: 8, include: { jurusan1: true } }),
    prisma.pendaftar.count({ where: { ...where, berkasSinkron: "gagal" } }),
    prisma.pendaftar.count({ where: { ...where, berkasSinkron: "menunggu" } }),
    statusDrive().catch(() => ({ terhubung: false, email: null, adaKredensial: false })),
  ]);

  const hitung = (s: string) => perStatus.find((x) => x.statusVerifikasi === s)?._count._all ?? 0;
  const total = perStatus.reduce((a, x) => a + x._count._all, 0);

  const perJurusan = jurusan.map<KartuJurusan>((j) => {
    const terdaftar = terpakai.get(String(j.id)) ?? 0;
    return {
      kode: j.kode,
      nama: j.nama,
      kuota: j.kuota,
      terdaftar,
      persen: j.kuota > 0 ? Math.round((terdaftar / j.kuota) * 100) : 0,
      rekomendasi: rekomendasi.find((x) => x.rekomendasiJurusanId === j.id)?._count._all ?? 0,
    };
  });

  const peta = new Map(perHariMentah.map((x) => [x.d, x.n]));
  const perHari = daftarHari(HARI_GRAFIK).map((tanggal) => ({ tanggal, jumlah: peta.get(tanggal) ?? 0 }));

  const peringatan: DataDashboard["peringatan"] = [];
  if (!drive.terhubung) {
    peringatan.push({ nada: "peringatan", teks: "Google Drive belum terhubung. Berkas pendaftar masih disimpan sementara.", href: "/admin/pengaturan" });
  }
  if (gagal > 0) peringatan.push({ nada: "bahaya", teks: `${gagal} pendaftar gagal sinkron berkas ke Drive.`, href: "/admin/peserta?sinkron=gagal" });
  else if (drive.terhubung && menunggu > 0) peringatan.push({ nada: "peringatan", teks: `${menunggu} pendaftar menunggu sinkron berkas ke Drive.`, href: "/admin/peserta?sinkron=menunggu" });
  for (const j of perJurusan.filter((x) => x.persen >= 80)) {
    peringatan.push({ nada: j.persen >= 100 ? "bahaya" : "peringatan", teks: `Kuota ${j.kode} terisi ${j.persen}% (${j.terdaftar} dari ${j.kuota}).`, href: "/admin/kuota" });
  }

  return {
    periode,
    total,
    pending: hitung("pending"),
    approved: hitung("approved"),
    revisiAtauDitolak: hitung("revision") + hitung("rejected"),
    nilaiBelumDicek,
    perJurusan,
    perHari,
    terbaru: terbaru.map((p) => ({
      id: p.id.toString(),
      nomor: p.nomorPendaftaran,
      nama: p.namaLengkap,
      status: p.statusVerifikasi,
      jurusan: p.jurusan1?.kode ?? null,
      dikirim: p.createdAt,
    })),
    peringatan,
  };
}
