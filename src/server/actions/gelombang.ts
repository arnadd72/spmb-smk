import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { ambilKonfigWizard } from "@/server/services/draf";
import { daftarGelombang, type InfoGelombang } from "@/server/services/gelombang";
import { GalatApi } from "@/server/types/galat";
import { skemaGelombang, type InputGelombang } from "@/server/validasi/gelombang";
import type { KonteksAksi } from "./konten";

// Pengelolaan gelombang pendaftaran oleh panitia (PRD v4 1.3 butir 44).

export async function ambilGelombangAdmin(): Promise<{ periode: string; baris: InfoGelombang[]; totalKuota: number | null; totalTerisi: number }> {
  const periode = (await ambilKonfigWizard()).tahunAjaran;
  const baris = await daftarGelombang(periode, { semua: true });
  const aktif = baris.filter((g) => g.isActive);
  return {
    periode,
    baris,
    totalKuota: aktif.length > 0 && aktif.every((g) => g.kuota !== null) ? aktif.reduce((a, g) => a + (g.kuota ?? 0), 0) : null,
    totalTerisi: baris.reduce((a, g) => a + g.terisi, 0),
  };
}

const idGelombang = (id: string) => {
  if (!/^\d{1,18}$/.test(id)) throw GalatApi.tidakDitemukan("Gelombang tidak ditemukan.");
  return BigInt(id);
};

/** Gelombang aktif tidak boleh tumpang tindih tanggalnya (supaya pendaftar jelas masuk gelombang mana). */
async function pastikanTidakTumpangTindih(periode: string, d: InputGelombang, kecuali?: bigint) {
  if (!d.isActive) return;
  const bentrok = await prisma.gelombang.findFirst({
    where: { periode, isActive: true, ...(kecuali ? { id: { not: kecuali } } : {}), buka: { lte: d.tutup }, tutup: { gte: d.buka } },
  });
  if (bentrok) throw GalatApi.validasi({ buka: [`Tanggal bertumpang tindih dengan ${bentrok.nama} (${bentrok.buka} sampai ${bentrok.tutup}).`] });
}

export async function buatGelombang(mentah: unknown, ctx: KonteksAksi) {
  const d = skemaGelombang.parse(mentah);
  const periode = (await ambilKonfigWizard()).tahunAjaran;
  await pastikanTidakTumpangTindih(periode, d);
  const terakhir = await prisma.gelombang.aggregate({ where: { periode }, _max: { urutan: true } });
  const baru = await prisma.gelombang.create({
    data: { periode, nama: d.nama, buka: d.buka, tutup: d.tutup, kuota: d.kuota, isActive: d.isActive, urutan: (terakhir._max.urutan ?? 0) + 1 },
  });
  await catatAudit({ userId: ctx.userId, aksi: "gelombang.buat", entitasTipe: "gelombang", entitasId: baru.id.toString(), dataBaru: d, ip: ctx.ip });
  return { id: baru.id.toString() };
}

export async function ubahGelombang(id: string, mentah: unknown, ctx: KonteksAksi) {
  const pid = idGelombang(id);
  const d = skemaGelombang.parse(mentah);
  const lama = await prisma.gelombang.findUnique({ where: { id: pid } });
  if (!lama) throw GalatApi.tidakDitemukan("Gelombang tidak ditemukan.");
  await pastikanTidakTumpangTindih(lama.periode, d, pid);
  await prisma.gelombang.update({ where: { id: pid }, data: { nama: d.nama, buka: d.buka, tutup: d.tutup, kuota: d.kuota, isActive: d.isActive } });
  await catatAudit({
    userId: ctx.userId,
    aksi: "gelombang.ubah",
    entitasTipe: "gelombang",
    entitasId: id,
    dataLama: { nama: lama.nama, buka: lama.buka, tutup: lama.tutup, kuota: lama.kuota, isActive: lama.isActive },
    dataBaru: d,
    ip: ctx.ip,
  });
}

export async function hapusGelombang(id: string, ctx: KonteksAksi) {
  const pid = idGelombang(id);
  const g = await prisma.gelombang.findUnique({ where: { id: pid }, include: { _count: { select: { pendaftar: true } } } });
  if (!g) throw GalatApi.tidakDitemukan("Gelombang tidak ditemukan.");
  if (g._count.pendaftar > 0) {
    throw new GalatApi(409, "GELOMBANG_TERPAKAI", `${g.nama} sudah punya ${g._count.pendaftar} pendaftar dan tidak bisa dihapus. Nonaktifkan saja.`);
  }
  await prisma.gelombang.delete({ where: { id: pid } });
  await catatAudit({ userId: ctx.userId, aksi: "gelombang.hapus", entitasTipe: "gelombang", entitasId: id, dataLama: { nama: g.nama, buka: g.buka, tutup: g.tutup }, ip: ctx.ip });
}
