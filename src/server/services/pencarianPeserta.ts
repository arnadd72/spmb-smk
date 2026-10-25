import type { Prisma } from "@/generated/prisma/client";
import { hashPencarian } from "@/server/services/kripto";
import { normalisasiHp } from "@/server/services/pendaftarKolom";

// Filter dan pencarian pendaftar: satu definisi dipakai daftar peserta, ekspor XLSX, dan rekap PDF.

export type FilterPeserta = {
  q?: string;
  status?: "pending" | "approved" | "rejected" | "revision";
  jurusan?: string;
  sumber?: "daring" | "luring";
  sinkron?: "menunggu" | "selesai" | "gagal";
  /** Hanya pendaftar dengan nama dan tanggal lahir sama yang belum ditandai bukan duplikat (poin E). */
  ganda?: boolean;
  /** "semua" = semua periode. Kosong = periode aktif. */
  periode?: string;
  dari?: string;
  sampai?: string;
  urut?: "dikirim" | "nama" | "nomor" | "status";
  arah?: "asc" | "desc";
  halaman?: number;
};

const ENUM = {
  status: ["pending", "approved", "rejected", "revision"],
  sumber: ["daring", "luring"],
  sinkron: ["menunggu", "selesai", "gagal"],
  urut: ["dikirim", "nama", "nomor", "status"],
  arah: ["asc", "desc"],
} as const;

const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pilih = <T extends string>(v: string | undefined, daftar: readonly T[]): T | undefined => (daftar.includes(v as T) ? (v as T) : undefined);
const tanggal = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined);

/** Ubah searchParams halaman menjadi filter yang sudah divalidasi (nilai tak dikenal dibuang). */
export function bacaFilter(sp: Record<string, string | string[] | undefined>): FilterPeserta {
  const q = satu(sp.q)?.trim().slice(0, 100);
  const h = Number(satu(sp.halaman));
  return {
    q: q || undefined,
    status: pilih(satu(sp.status), ENUM.status),
    jurusan: satu(sp.jurusan)?.toUpperCase().slice(0, 20) || undefined,
    sumber: pilih(satu(sp.sumber), ENUM.sumber),
    sinkron: pilih(satu(sp.sinkron), ENUM.sinkron),
    ganda: satu(sp.ganda) === "1" || undefined,
    periode: satu(sp.periode)?.slice(0, 20) || undefined,
    dari: tanggal(satu(sp.dari)),
    sampai: tanggal(satu(sp.sampai)),
    urut: pilih(satu(sp.urut), ENUM.urut),
    arah: pilih(satu(sp.arah), ENUM.arah),
    halaman: Number.isInteger(h) && h > 0 ? h : 1,
  };
}

/** Kondisi pencarian dan filter; dipakai daftar dan, kelak, ekspor hasil filter. */
export function kondisiPeserta(f: FilterPeserta, periodeAktif: string): Prisma.PendaftarWhereInput {
  const and: Prisma.PendaftarWhereInput[] = [];
  const periode = f.periode ?? periodeAktif;
  if (periode !== "semua") and.push({ periode });
  if (f.status) and.push({ statusVerifikasi: f.status });
  if (f.sumber) and.push({ sumber: f.sumber });
  if (f.sinkron) and.push({ berkasSinkron: f.sinkron });
  if (f.jurusan) and.push({ jurusan1: { kode: f.jurusan } });
  if (f.dari) and.push({ createdAt: { gte: new Date(`${f.dari}T00:00:00+07:00`) } });
  if (f.sampai) and.push({ createdAt: { lt: new Date(new Date(`${f.sampai}T00:00:00+07:00`).getTime() + 86400_000) } });

  const q = f.q?.trim();
  if (q) {
    const atau: Prisma.PendaftarWhereInput[] = [
      { namaLengkap: { contains: q, mode: "insensitive" } },
      { nomorPendaftaran: { contains: q, mode: "insensitive" } },
      { nisn: { contains: q } },
      { asalSekolah: { contains: q, mode: "insensitive" } },
    ];
    const digit = q.replace(/\D/g, "");
    if (/^\d{16}$/.test(q)) atau.push({ nikHash: hashPencarian(q) });
    if (digit.length >= 8 && /^[\d\s+\-]+$/.test(q)) atau.push({ noHpHash: hashPencarian(normalisasiHp(q)) });
    and.push({ OR: atau });
  }
  return { AND: and };
}

