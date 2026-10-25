import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { GalatApi } from "@/server/types/galat";

// Deteksi pendaftar ganda (poin E, PRD 1.3 butir 69).
// - NISN sama dengan pendaftar yang sudah ada: pendaftaran atau perubahan ditolak. Pesan untuk publik tidak menyebut nomor
//   atau nama pendaftar lain; pesan untuk panitia menyebut nomornya.
// - Nama dan tanggal lahir sama, NISN beda: tetap boleh (bisa kembar atau salah ketik NISN), pendaftar diberi peringatan,
//   panitia melihat tanda "kemungkinan ganda" sampai menandainya bukan duplikat.

type Klien = Prisma.TransactionClient | typeof prisma;

const PESAN_NISN_PUBLIK =
  "NISN ini sudah terdaftar. Bila Anda sudah pernah mendaftar, buka halaman Cek Pendaftaran dengan nomor pendaftaran dan tanggal lahir. Bila merasa belum pernah mendaftar, hubungi panitia.";

export const PERINGATAN_NAMA_TANGGAL =
  "Sudah ada pendaftar dengan nama dan tanggal lahir yang sama. Bila itu Anda, tidak perlu mendaftar lagi: buka halaman Cek Pendaftaran. Bila bukan Anda, tekan Lanjut sekali lagi untuk meneruskan.";

/** Nama untuk dibandingkan: huruf besar, tanda baca jadi spasi, spasi ganda dirapatkan. */
export function normalisasiNama(nama: string): string {
  return nama
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Tolak NISN yang sudah dipakai pendaftar lain (`kecualiId` = pendaftar yang sedang diubah). `untukPanitia` menambahkan
 * nomor pendaftar yang sudah ada ke pesan; pesan publik tidak membocorkan data pendaftar lain.
 */
export async function pastikanNisnBelumTerdaftar(
  nisn: unknown,
  opsi: { kecualiId?: bigint; untukPanitia?: boolean; klien?: Klien } = {},
): Promise<void> {
  if (typeof nisn !== "string" || nisn.trim() === "") return;
  const ada = await (opsi.klien ?? prisma).pendaftar.findFirst({
    where: { nisn: nisn.trim(), ...(opsi.kecualiId !== undefined ? { id: { not: opsi.kecualiId } } : {}) },
    select: { nomorPendaftaran: true },
  });
  if (!ada) return;
  throw GalatApi.validasi({
    nisn: [opsi.untukPanitia ? `NISN ini sudah terdaftar atas nomor ${ada.nomorPendaftaran}. Periksa data pendaftar itu dulu.` : PESAN_NISN_PUBLIK],
  });
}

const kunciTanggal = (t: Date) => t.toISOString().slice(0, 10);

/** Apakah sudah ada pendaftar dengan nama (dinormalisasi) dan tanggal lahir yang sama. */
export async function adaNamaTanggalSama(nama: unknown, tanggalLahir: unknown): Promise<boolean> {
  if (typeof nama !== "string" || typeof tanggalLahir !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tanggalLahir)) return false;
  const calon = await prisma.pendaftar.findMany({ where: { tanggalLahir: new Date(`${tanggalLahir}T00:00:00Z`) }, select: { namaLengkap: true } });
  const target = normalisasiNama(nama);
  return calon.some((c) => normalisasiNama(c.namaLengkap) === target);
}

/** Pendaftar lain yang nama dan tanggal lahirnya sama. Kosong bila pendaftar ini sudah ditandai bukan duplikat. */
export async function kemungkinanGanda(id: bigint): Promise<{ id: string; nomor: string; nama: string }[]> {
  const p = await prisma.pendaftar.findUnique({ where: { id }, select: { namaLengkap: true, tanggalLahir: true, bukanDuplikat: true } });
  if (!p || !p.tanggalLahir || p.bukanDuplikat) return [];
  const target = normalisasiNama(p.namaLengkap);
  const calon = await prisma.pendaftar.findMany({
    where: { tanggalLahir: p.tanggalLahir, id: { not: id } },
    select: { id: true, nomorPendaftaran: true, namaLengkap: true },
    orderBy: { id: "asc" },
  });
  return calon.filter((c) => normalisasiNama(c.namaLengkap) === target).map((c) => ({ id: c.id.toString(), nomor: c.nomorPendaftaran, nama: c.namaLengkap }));
}

/** ID semua pendaftar yang punya pasangan nama dan tanggal lahir sama dan belum ditandai bukan duplikat. */
export async function idKemungkinanGanda(): Promise<bigint[]> {
  const semua = await prisma.pendaftar.findMany({
    where: { tanggalLahir: { not: null } },
    select: { id: true, namaLengkap: true, tanggalLahir: true, bukanDuplikat: true },
  });
  const kelompok = new Map<string, typeof semua>();
  for (const p of semua) {
    const k = `${kunciTanggal(p.tanggalLahir!)}|${normalisasiNama(p.namaLengkap)}`;
    kelompok.set(k, [...(kelompok.get(k) ?? []), p]);
  }
  return [...kelompok.values()].filter((g) => g.length > 1).flatMap((g) => g.filter((p) => !p.bukanDuplikat).map((p) => p.id));
}

/** Panitia menandai pendaftar ini bukan duplikat (sudah diperiksa). Diaudit. */
export async function tandaiBukanDuplikat(id: string, ctx: { userId: string; ip?: string }): Promise<void> {
  if (!/^\d{1,18}$/.test(id)) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");
  const pid = BigInt(id);
  const p = await prisma.pendaftar.findUnique({ where: { id: pid }, select: { id: true } });
  if (!p) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");
  await prisma.pendaftar.update({ where: { id: pid }, data: { bukanDuplikat: true } });
  await catatAudit({ userId: ctx.userId, aksi: "pendaftar.bukan_duplikat", entitasTipe: "pendaftar", entitasId: id, ip: ctx.ip });
}
