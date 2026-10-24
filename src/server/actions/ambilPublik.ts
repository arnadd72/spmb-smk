import { prisma } from "@/server/db/client";

// Data halaman publik di luar landing (PRD v3.1 10.3 dan Bagian 9.1). Konten nonaktif tidak pernah keluar.

const array = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export type JurusanDetail = {
  kode: string;
  nama: string;
  deskripsi: string;
  prospekKarir: string[];
  keunggulan: string[];
  kuota: number;
  /** Peminat pilihan 1 yang belum ditolak. */
  terdaftar: number;
  sisa: number;
  /** Foto pilihan admin; null memakai foto bawaan situs. */
  gambar: string | null;
};

export async function ambilDaftarJurusan(): Promise<JurusanDetail[]> {
  const data = await prisma.jurusan.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" } });

  const hitung = await prisma.pendaftar.groupBy({
    by: ["jurusan1Id"],
    where: { statusVerifikasi: { not: "rejected" }, jurusan1Id: { not: null } },
    _count: { _all: true },
  });
  const terdaftarPer = new Map(hitung.map((h) => [String(h.jurusan1Id), h._count._all]));

  return data.map((j) => {
    const terdaftar = terdaftarPer.get(String(j.id)) ?? 0;
    return {
      kode: j.kode,
      nama: j.nama,
      deskripsi: j.deskripsi ?? "",
      prospekKarir: array(j.prospekKarir),
      keunggulan: array(j.keunggulan),
      kuota: j.kuota,
      terdaftar,
      sisa: Math.max(0, j.kuota - terdaftar),
      gambar: j.gambar,
    };
  });
}

/** Kode tidak peka huruf. Tidak ada atau nonaktif: null (halaman menampilkan 404). */
export async function ambilJurusanPublik(kode: string): Promise<JurusanDetail | null> {
  const semua = await ambilDaftarJurusan();
  return semua.find((j) => j.kode.toLowerCase() === kode.toLowerCase()) ?? null;
}

export type BeritaRingkas = {
  slug: string;
  judul: string;
  gambar: string | null;
  tanggal: Date;
  cuplikan: string;
};

const tanpaTag = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function ambilDaftarBerita(batas = 30): Promise<BeritaRingkas[]> {
  const data = await prisma.berita.findMany({
    where: { isActive: true, publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take: batas,
  });
  return data.map((b) => ({
    slug: b.slug,
    judul: b.judul,
    gambar: b.gambar,
    tanggal: b.publishedAt ?? b.createdAt,
    cuplikan: tanpaTag(b.isi).slice(0, 180),
  }));
}

export type BeritaDetail = BeritaRingkas & { isiHtml: string };

/** `isiHtml` sudah disanitasi saat disimpan (src/server/services/sanitasi.ts). */
export async function ambilBerita(slug: string): Promise<BeritaDetail | null> {
  const b = await prisma.berita.findFirst({ where: { slug, isActive: true, publishedAt: { lte: new Date() } } });
  if (!b) return null;
  return {
    slug: b.slug,
    judul: b.judul,
    gambar: b.gambar,
    tanggal: b.publishedAt ?? b.createdAt,
    cuplikan: tanpaTag(b.isi).slice(0, 180),
    isiHtml: b.isi,
  };
}

export type EventRingkas = { slug: string; judul: string; tanggal: Date; lokasi: string | null };

function awalHariIniWib(): Date {
  const hari = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  return new Date(`${hari}T00:00:00+07:00`);
}

export async function ambilAgendaMendatang(batas = 3): Promise<EventRingkas[]> {
  const data = await prisma.event.findMany({
    // Agenda hari ini tetap tampil sepanjang hari (WIB), meski jamnya sudah lewat.
    where: { isActive: true, tanggal: { gte: awalHariIniWib() } },
    orderBy: { tanggal: "asc" },
    take: batas,
  });
  return data.map((e) => ({ slug: e.slug, judul: e.judul, tanggal: e.tanggal, lokasi: e.lokasi }));
}
