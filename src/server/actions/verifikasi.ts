import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { hitungRekomendasi, mapelBerbobot, muatBobotJurusan } from "@/server/services/rekomendasi";
import { GalatApi } from "@/server/types/galat";
import { skemaVerifikasi, skemaNilaiPanitia } from "@/server/validasi/verifikasi";
import { skemaNilaiRapor, type NilaiRapor } from "@/server/validasi/wizard";
import { idPendaftar } from "./peserta";
import type { KonteksAksi } from "./konten";

// Verifikasi pendaftar oleh panitia (PRD v3.1 13.4): keputusan status, pemeriksaan dan koreksi nilai rapor.

const STATUS_BARU = { setujui: "approved", revisi: "revision", tolak: "rejected" } as const;
const AKSI_AUDIT = { setujui: "pendaftar.setujui", revisi: "pendaftar.revisi", tolak: "pendaftar.tolak" } as const;

export async function putuskanVerifikasi(id: string, mentah: unknown, ctx: KonteksAksi) {
  const input = skemaVerifikasi.parse(mentah);
  const pid = idPendaftar(id);
  const lama = await prisma.pendaftar.findUnique({ where: { id: pid } });
  if (!lama) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");

  const catatan = "catatan" in input ? input.catatan : null;
  const baru = await prisma.pendaftar.update({
    where: { id: pid },
    data: {
      statusVerifikasi: STATUS_BARU[input.aksi],
      catatanVerifikasi: input.aksi === "revisi" ? catatan : null,
      catatanPenolakan: input.aksi === "tolak" ? catatan : null,
      diverifikasiOlehId: BigInt(ctx.userId),
      diverifikasiAt: new Date(),
    },
  });
  await catatAudit({
    userId: ctx.userId,
    aksi: AKSI_AUDIT[input.aksi],
    entitasTipe: "pendaftar",
    entitasId: pid.toString(),
    dataLama: { status: lama.statusVerifikasi, catatan: lama.catatanVerifikasi ?? lama.catatanPenolakan },
    dataBaru: { status: baru.statusVerifikasi, catatan },
    ip: ctx.ip,
  });
  return { status: baru.statusVerifikasi };
}

/** Pendaftar menunggu berikutnya (paling lama dulu) selain yang sedang dibuka. Null bila antrean kosong. */
export async function pendaftarBerikutnya(sekarang?: string): Promise<string | null> {
  const p = await prisma.pendaftar.findFirst({
    where: { statusVerifikasi: "pending", ...(sekarang && /^\d+$/.test(sekarang) ? { id: { not: BigInt(sekarang) } } : {}) },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return p ? p.id.toString() : null;
}

export async function antreanVerifikasi(batas = 50) {
  const [daftar, total] = await Promise.all([
    prisma.pendaftar.findMany({
      where: { statusVerifikasi: "pending" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: batas,
      include: { jurusan1: { select: { kode: true } } },
    }),
    prisma.pendaftar.count({ where: { statusVerifikasi: "pending" } }),
  ]);
  return {
    total,
    daftar: daftar.map((p) => ({
      id: p.id.toString(),
      nomor: p.nomorPendaftaran,
      nama: p.namaLengkap,
      asalSekolah: p.asalSekolah,
      jurusan: p.jurusan1?.kode ?? null,
      statusNilai: p.statusNilai,
      dikirim: p.createdAt,
    })),
  };
}

/** "Nilai sesuai" atau koreksi sel. Koreksi menghitung ulang rekomendasi dengan bobot saat ini. */
export async function periksaNilai(id: string, mentah: unknown, ctx: KonteksAksi) {
  const input = skemaNilaiPanitia.parse(mentah);
  const pid = idPendaftar(id);
  const lama = await prisma.pendaftar.findUnique({ where: { id: pid } });
  if (!lama) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");

  if (input.aksi === "sesuai") {
    await prisma.pendaftar.update({ where: { id: pid }, data: { statusNilai: "sesuai" } });
    await catatAudit({
      userId: ctx.userId,
      aksi: "pendaftar.nilai_sesuai",
      entitasTipe: "pendaftar",
      entitasId: pid.toString(),
      dataLama: { statusNilai: lama.statusNilai },
      dataBaru: { statusNilai: "sesuai" },
      ip: ctx.ip,
    });
    return { statusNilai: "sesuai" as const };
  }

  const bobot = await muatBobotJurusan();
  const rapor = lama.nilaiRapor as unknown as NilaiRapor;
  const wajib = mapelBerbobot(bobot).map((m) => m.kode);
  const cek = skemaNilaiRapor(rapor.semester, wajib).safeParse({ semester: rapor.semester, mapel: input.mapel });
  if (!cek.success) {
    const galat: Record<string, string[]> = {};
    for (const i of cek.error.issues) (galat[`mapel.${i.path.slice(1).join(".")}`] ??= []).push(i.message);
    throw GalatApi.validasi(galat);
  }
  const baru = cek.data;
  const hasil = hitungRekomendasi(baru, bobot);
  const terbaik = hasil.peringkat.find((p) => p.label === "Paling Sesuai");

  // Nilai asli (sebelum koreksi pertama) disimpan sekali supaya selisih selalu bisa ditelusuri.
  const asli = (lama.nilaiRaporKoreksi as { asli?: NilaiRapor } | null)?.asli ?? rapor;
  await prisma.pendaftar.update({
    where: { id: pid },
    data: {
      nilaiRapor: JSON.parse(JSON.stringify(baru)),
      nilaiRaporKoreksi: JSON.parse(JSON.stringify({ asli, diubahOleh: ctx.userId, pada: new Date().toISOString() })),
      statusNilai: "dikoreksi",
      nilaiRaporSumber: lama.nilaiRaporSumber.endsWith("_dikoreksi") || lama.nilaiRaporSumber === "manual" ? lama.nilaiRaporSumber : `${lama.nilaiRaporSumber}_dikoreksi`,
      rekomendasiSkor: JSON.parse(JSON.stringify(hasil.peringkat)),
      rekomendasiVersi: hasil.versi,
      rekomendasiJurusanId: terbaik ? BigInt(terbaik.jurusanId) : null,
    },
  });

  // Audit hanya sel yang berubah.
  const selBerubah: Record<string, { lama: unknown; baru: unknown }> = {};
  for (const kode of new Set([...Object.keys(rapor.mapel), ...Object.keys(baru.mapel)])) {
    for (const s of rapor.semester) {
      const a = rapor.mapel[kode]?.[String(s)];
      const b = baru.mapel[kode]?.[String(s)];
      if (a !== b) selBerubah[`${kode}.s${s}`] = { lama: a ?? null, baru: b ?? null };
    }
  }
  await catatAudit({
    userId: ctx.userId,
    aksi: "pendaftar.nilai_koreksi",
    entitasTipe: "pendaftar",
    entitasId: pid.toString(),
    dataLama: { rekomendasi: lama.rekomendasiJurusanId?.toString() ?? null, statusNilai: lama.statusNilai },
    dataBaru: { sel: selBerubah, rekomendasi: terbaik?.kode ?? null, statusNilai: "dikoreksi" },
    ip: ctx.ip,
  });
  return { statusNilai: "dikoreksi" as const, saran: terbaik?.kode ?? null };
}
