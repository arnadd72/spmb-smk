import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { GalatApi } from "@/server/types/galat";
import { skemaBobot, skemaMapel } from "@/server/validasi/referensi";
import type { KonteksAksi } from "./konten";

// Bobot jurusan dan mata pelajaran (PRD v3.1 13.9). Perubahan bobot menaikkan versi rekomendasi (hash bobot);
// skor pendaftar yang sudah submit tidak berubah.

export type MapelAdmin = { kode: string; nama: string; alias: string[]; kelompok: string; urutan: number; isActive: boolean; dipakaiBobot: number };

export async function daftarMapelAdmin(): Promise<MapelAdmin[]> {
  const data = await prisma.mataPelajaran.findMany({ orderBy: { urutan: "asc" }, include: { _count: { select: { bobot: true } } } });
  return data.map((m) => ({
    kode: m.kode,
    nama: m.nama,
    alias: m.alias as string[],
    kelompok: m.kelompok,
    urutan: m.urutan,
    isActive: m.isActive,
    dipakaiBobot: m._count.bobot,
  }));
}

export type EditorBobotJurusan = { id: string; kode: string; nama: string; urutan: number; bobot: Record<string, number> };

/** Bobot per jurusan aktif untuk editor (kode mapel ke bobot) bersama daftar mapel aktif. */
export async function ambilEditorBobot() {
  const [jurusan, mapel] = await Promise.all([
    prisma.jurusan.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" }, include: { bobot: { include: { mataPelajaran: true } } } }),
    prisma.mataPelajaran.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" } }),
  ]);
  return {
    mapel: mapel.map((m) => ({ kode: m.kode, nama: m.nama })),
    jurusan: jurusan.map<EditorBobotJurusan>((j) => ({
      id: j.id.toString(),
      kode: j.kode,
      nama: j.nama,
      urutan: j.urutan,
      bobot: Object.fromEntries(j.bobot.filter((b) => b.mataPelajaran.isActive).map((b) => [b.mataPelajaran.kode, Number(b.bobot)])),
    })),
  };
}

export async function simpanBobot(kodeJurusan: string, mentah: unknown, ctx: KonteksAksi) {
  const { bobot } = skemaBobot.parse(mentah);
  const j = await prisma.jurusan.findUnique({ where: { kode: kodeJurusan.toUpperCase() }, include: { bobot: { include: { mataPelajaran: true } } } });
  if (!j) throw GalatApi.tidakDitemukan("Jurusan tidak ditemukan.");
  const mapel = await prisma.mataPelajaran.findMany({ where: { isActive: true } });
  const peta = new Map(mapel.map((m) => [m.kode, m]));
  const asing = Object.keys(bobot).filter((k) => !peta.has(k));
  if (asing.length > 0) throw GalatApi.validasi({ bobot: [`Mata pelajaran tidak dikenal atau nonaktif: ${asing.join(", ")}.`] });

  const lama = Object.fromEntries(j.bobot.map((b) => [b.mataPelajaran.kode, Number(b.bobot)]));
  const baru = Object.fromEntries(
    Object.entries(bobot)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => [k, Math.round(v * 1000) / 1000]),
  );

  await prisma.$transaction(async (tx) => {
    for (const [kode, nilai] of Object.entries(baru)) {
      const m = peta.get(kode)!;
      await tx.bobotJurusan.upsert({
        where: { jurusanId_mataPelajaranId: { jurusanId: j.id, mataPelajaranId: m.id } },
        create: { jurusanId: j.id, mataPelajaranId: m.id, bobot: nilai },
        update: { bobot: nilai },
      });
    }
    const hapus = [...peta.values()].filter((m) => !(m.kode in baru)).map((m) => m.id);
    if (hapus.length > 0) await tx.bobotJurusan.deleteMany({ where: { jurusanId: j.id, mataPelajaranId: { in: hapus } } });
  });

  await catatAudit({ userId: ctx.userId, aksi: "bobot.ubah", entitasTipe: "jurusan", entitasId: j.kode, dataLama: lama, dataBaru: baru, ip: ctx.ip });
  return { bobot: baru, total: Math.round(Object.values(baru).reduce((a, b) => a + b, 0) * 1000) / 1000 };
}

// ------------------------------------------------------------------ mata pelajaran

export async function buatMapel(mentah: unknown, ctx: KonteksAksi) {
  const input = skemaMapel.parse(mentah);
  if (await prisma.mataPelajaran.findUnique({ where: { kode: input.kode } })) throw GalatApi.validasi({ kode: ["Kode sudah dipakai."] });
  const akhir = await prisma.mataPelajaran.aggregate({ _max: { urutan: true } });
  const baru = await prisma.mataPelajaran.create({
    data: {
      kode: input.kode,
      nama: input.nama,
      alias: input.alias,
      kelompok: input.kelompok,
      isActive: input.isActive,
      urutan: input.urutan ?? (akhir._max.urutan ?? 0) + 1,
    },
  });
  await catatAudit({ userId: ctx.userId, aksi: "mapel.buat", entitasTipe: "mapel", entitasId: baru.kode, dataBaru: { nama: baru.nama, kelompok: baru.kelompok }, ip: ctx.ip });
  return { kode: baru.kode };
}

export async function ubahMapel(kode: string, mentah: unknown, ctx: KonteksAksi) {
  const lama = await prisma.mataPelajaran.findUnique({ where: { kode } });
  if (!lama) throw GalatApi.tidakDitemukan("Mata pelajaran tidak ditemukan.");
  const input = skemaMapel.parse({ ...(mentah as object), kode }); // kode tidak bisa diganti
  const data: Prisma.MataPelajaranUpdateInput = {
    nama: input.nama,
    alias: input.alias,
    kelompok: input.kelompok,
    isActive: input.isActive,
    ...(input.urutan !== undefined ? { urutan: input.urutan } : {}),
  };
  await prisma.mataPelajaran.update({ where: { kode }, data });
  await catatAudit({
    userId: ctx.userId,
    aksi: "mapel.ubah",
    entitasTipe: "mapel",
    entitasId: kode,
    dataLama: { nama: lama.nama, alias: lama.alias, kelompok: lama.kelompok, isActive: lama.isActive, urutan: lama.urutan },
    dataBaru: { nama: input.nama, alias: input.alias, kelompok: input.kelompok, isActive: input.isActive, urutan: input.urutan ?? lama.urutan },
    ip: ctx.ip,
  });
  return { kode };
}

/** Hanya mapel yang belum dipakai bobot jurusan mana pun; selain itu nonaktifkan agar riwayat tetap utuh. */
export async function hapusMapel(kode: string, ctx: KonteksAksi) {
  const m = await prisma.mataPelajaran.findUnique({ where: { kode }, include: { _count: { select: { bobot: true } } } });
  if (!m) throw GalatApi.tidakDitemukan("Mata pelajaran tidak ditemukan.");
  if (m._count.bobot > 0) throw new GalatApi(409, "IN_USE", "Mata pelajaran masih dipakai bobot jurusan. Nonaktifkan saja, atau hapus bobotnya dulu.");
  await prisma.mataPelajaran.delete({ where: { kode } });
  await catatAudit({ userId: ctx.userId, aksi: "mapel.hapus", entitasTipe: "mapel", entitasId: kode, dataLama: { nama: m.nama }, ip: ctx.ip });
}
