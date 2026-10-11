import { prisma } from "@/server/db/client";
import { ambilPengaturan } from "@/server/services/pengaturan";
import { ambilAgendaMendatang, ambilDaftarBerita, type BeritaRingkas, type EventRingkas } from "./ambilPublik";

export type JurusanLanding = {
  kode: string;
  nama: string;
  deskripsi: string;
  prospekKarir: string[];
  keunggulan: string[];
  kuota: number;
  /** Mata pelajaran yang paling berpengaruh pada rekomendasi, urut bobot terbesar. */
  mapelUtama: string[];
};

export type FaqLanding = { id: string; pertanyaan: string; jawaban: string };

export type FotoGaleri = { id: string; judul: string | null; gambar: string };
export type TestimoniLanding = { id: string; nama: string; keterangan: string | null; isi: string; foto: string | null };

export type DataLanding = {
  jurusan: JurusanLanding[];
  faq: FaqLanding[];
  berita: BeritaRingkas[];
  agenda: EventRingkas[];
  galeri: FotoGaleri[];
  testimoni: TestimoniLanding[];
  /** Mis. "2027/2028". Null bila panitia belum mengisi pengaturan. */
  tahunAjaran: string | null;
};

const array = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/**
 * Data halaman landing (PRD v3.1 10.2). Konten nonaktif tidak ikut. Bila database tidak dapat dijangkau
 * (mis. saat build tanpa DB), mengembalikan data kosong sehingga bagian terkait disembunyikan, bukan error.
 */
export async function ambilDataLanding(): Promise<DataLanding> {
  try {
    const [jurusan, faq, tahunAjaran, berita, agenda, galeri, testimoni] = await Promise.all([
      prisma.jurusan.findMany({
        where: { isActive: true },
        orderBy: { urutan: "asc" },
        include: { bobot: { include: { mataPelajaran: true }, orderBy: { bobot: "desc" }, take: 3 } },
      }),
      prisma.faq.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" }, take: 6 }),
      ambilPengaturan("tahun_ajaran"),
      ambilDaftarBerita(3),
      ambilAgendaMendatang(3),
      prisma.galeri.findMany({ where: { isActive: true }, orderBy: [{ urutan: "asc" }, { id: "desc" }], take: 5 }),
      prisma.testimoni.findMany({ where: { isActive: true }, orderBy: [{ urutan: "asc" }, { id: "desc" }], take: 4 }),
    ]);

    return {
      tahunAjaran,
      jurusan: jurusan.map((j) => ({
        kode: j.kode,
        nama: j.nama,
        deskripsi: j.deskripsi ?? "",
        prospekKarir: array(j.prospekKarir),
        keunggulan: array(j.keunggulan),
        kuota: j.kuota,
        mapelUtama: j.bobot.map((b) => b.mataPelajaran.nama),
      })),
      faq: faq.map((f) => ({ id: f.id.toString(), pertanyaan: f.pertanyaan, jawaban: f.jawaban })),
      berita,
      agenda,
      galeri: galeri.map((g) => ({ id: g.id.toString(), judul: g.judul, gambar: g.gambar })),
      testimoni: testimoni.map((t) => ({ id: t.id.toString(), nama: t.nama, keterangan: t.keterangan, isi: t.isi, foto: t.foto })),
    };
  } catch (e) {
    console.error("[landing] gagal membaca data:", e instanceof Error ? e.message : "tidak diketahui");
    return { jurusan: [], faq: [], berita: [], agenda: [], galeri: [], testimoni: [], tahunAjaran: null };
  }
}
