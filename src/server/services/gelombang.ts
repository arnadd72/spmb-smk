import { prisma } from "@/server/db/client";
import { GalatApi } from "@/server/types/galat";

// Gelombang pendaftaran (PRD v4 1.3 butir 44). Satu definisi "terisi" dan "status" dipakai wizard, admin, landing, dan ekspor.

type Db = Pick<typeof prisma, "gelombang" | "pendaftar">;

export type StatusGelombang = "belum" | "buka" | "tutup" | "penuh";

export type InfoGelombang = {
  id: string;
  nama: string;
  urutan: number;
  buka: string;
  tutup: string;
  kuota: number | null;
  terisi: number;
  /** Null bila tanpa batas. */
  sisa: number | null;
  isActive: boolean;
  status: StatusGelombang;
};

export const hariIniWib = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

/** Pendaftar yang menempati kuota gelombang: semua kecuali yang ditolak. */
async function terisiPerGelombang(db: Db, periode: string): Promise<Map<string, number>> {
  const baris = await db.pendaftar.groupBy({
    by: ["gelombangId"],
    where: { periode, gelombangId: { not: null }, statusVerifikasi: { not: "rejected" } },
    _count: { _all: true },
  });
  return new Map(baris.map((b) => [String(b.gelombangId), b._count._all]));
}

export function statusGelombang(g: { buka: string; tutup: string; kuota: number | null }, terisi: number, hari: string): StatusGelombang {
  if (hari < g.buka) return "belum";
  if (hari > g.tutup) return "tutup";
  if (g.kuota !== null && terisi >= g.kuota) return "penuh";
  return "buka";
}

/** Semua gelombang satu periode (urut tanggal buka), lengkap dengan terisi dan status hari ini. */
export async function daftarGelombang(periode: string, opsi: { semua?: boolean; db?: Db; hari?: string } = {}): Promise<InfoGelombang[]> {
  const db = opsi.db ?? prisma;
  const hari = opsi.hari ?? hariIniWib();
  const [baris, terisi] = await Promise.all([
    db.gelombang.findMany({ where: { periode, ...(opsi.semua ? {} : { isActive: true }) }, orderBy: [{ buka: "asc" }, { urutan: "asc" }] }),
    terisiPerGelombang(db, periode),
  ]);
  return baris.map((g) => {
    const t = terisi.get(String(g.id)) ?? 0;
    return {
      id: String(g.id),
      nama: g.nama,
      urutan: g.urutan,
      buka: g.buka,
      tutup: g.tutup,
      kuota: g.kuota,
      terisi: t,
      sisa: g.kuota === null ? null : Math.max(0, g.kuota - t),
      isActive: g.isActive,
      status: statusGelombang(g, t, hari),
    };
  });
}

export type KeadaanPendaftaran = {
  status: "buka" | "belum" | "tutup";
  alasanTutup: "penuh" | "selesai" | null;
  /** Gelombang yang sedang berjalan, atau yang penuh, atau yang berikutnya. */
  saatIni: InfoGelombang | null;
  berikut: InfoGelombang | null;
  adaGelombang: boolean;
};

/** Tentukan buka/tutup dari daftar gelombang aktif. Tanpa gelombang: `adaGelombang` false, pemanggil memakai aturan lama. */
export function keadaanDariGelombang(daftar: InfoGelombang[]): KeadaanPendaftaran {
  if (daftar.length === 0) return { status: "buka", alasanTutup: null, saatIni: null, berikut: null, adaGelombang: false };
  const buka = daftar.find((g) => g.status === "buka");
  const penuh = daftar.find((g) => g.status === "penuh");
  const berikut = daftar.find((g) => g.status === "belum") ?? null;
  if (buka) return { status: "buka", alasanTutup: null, saatIni: buka, berikut, adaGelombang: true };
  if (penuh) return { status: "tutup", alasanTutup: "penuh", saatIni: penuh, berikut, adaGelombang: true };
  if (berikut) return { status: "belum", alasanTutup: null, saatIni: berikut, berikut, adaGelombang: true };
  return { status: "tutup", alasanTutup: "selesai", saatIni: daftar[daftar.length - 1], berikut: null, adaGelombang: true };
}

/**
 * Tetapkan gelombang untuk pendaftar baru di dalam transaksi (pemanggil sudah memegang advisory lock nomor, jadi kuota tidak
 * bisa terlampaui oleh kirim bersamaan). `blokir`: wizard publik ditolak bila tidak ada gelombang terbuka; input manual panitia
 * tidak diblokir dan memakai gelombang berjalan atau yang penuh.
 */
export async function tetapkanGelombang(db: Db, periode: string, opsi: { blokir: boolean }): Promise<bigint | null> {
  const daftar = await daftarGelombang(periode, { db });
  if (daftar.length === 0) return null;
  const k = keadaanDariGelombang(daftar);
  if (k.status === "buka" && k.saatIni) return BigInt(k.saatIni.id);
  if (!opsi.blokir) return k.alasanTutup === "penuh" && k.saatIni ? BigInt(k.saatIni.id) : null;
  throw pesanTutup(k);
}

export function pesanTutup(k: KeadaanPendaftaran): GalatApi {
  if (k.status === "belum" && k.saatIni) return new GalatApi(403, "PENDAFTARAN_BELUM_BUKA", `${k.saatIni.nama} dibuka pada ${k.saatIni.buka}.`);
  if (k.alasanTutup === "penuh" && k.saatIni) {
    const lanjut = k.berikut ? ` ${k.berikut.nama} dibuka pada ${k.berikut.buka}.` : "";
    return new GalatApi(403, "PENDAFTARAN_PENUH", `Kuota ${k.saatIni.nama} sudah penuh.${lanjut}`);
  }
  return new GalatApi(403, "PENDAFTARAN_TUTUP", "Pendaftaran sudah ditutup.");
}
