import type { ZodType } from "zod";
import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { hapusMediaBila } from "@/server/services/media";
import { sanitasiHtml } from "@/server/services/sanitasi";
import { serialisasi } from "@/server/services/serialisasi";
import { slugUnik } from "@/server/services/slug";
import { GalatApi } from "@/server/types/galat";
import { skemaBerita, skemaEvent, skemaFaq, skemaGaleri, skemaJurusan, skemaTestimoni } from "@/server/validasi/konten";

// CRUD konten admin (PRD v3.1 13.8). Satu implementasi untuk lima entitas yang bentuknya sama.

export type Entitas = "berita" | "event" | "galeri" | "testimoni" | "faq";
export const DAFTAR_ENTITAS: Entitas[] = ["berita", "event", "galeri", "testimoni", "faq"];

type Baris = Record<string, unknown>;
type Delegate = {
  findMany: (a: object) => Promise<Baris[]>;
  findUnique: (a: object) => Promise<Baris | null>;
  create: (a: object) => Promise<Baris>;
  update: (a: object) => Promise<Baris>;
  delete: (a: object) => Promise<Baris>;
  count: (a?: object) => Promise<number>;
};

type Konfig = {
  delegate: Delegate;
  skema: ZodType;
  urut: object;
  /** Kolom teks yang dicari lewat ?q= */
  cari: string[];
  /** Entitas yang punya slug dari judul. */
  slugDari?: "judul";
  /** Kolom HTML yang disanitasi sebelum disimpan. */
  sanitasi?: string;
  /** Nama tampil di audit log. */
  tipeAudit: string;
};

const KONFIG: Record<Entitas, Konfig> = {
  berita: { delegate: prisma.berita as unknown as Delegate, skema: skemaBerita, urut: { createdAt: "desc" }, cari: ["judul"], slugDari: "judul", sanitasi: "isi", tipeAudit: "berita" },
  event: { delegate: prisma.event as unknown as Delegate, skema: skemaEvent, urut: { tanggal: "desc" }, cari: ["judul"], slugDari: "judul", tipeAudit: "event" },
  galeri: { delegate: prisma.galeri as unknown as Delegate, skema: skemaGaleri, urut: [{ urutan: "asc" }, { id: "desc" }], cari: ["judul"], tipeAudit: "galeri" },
  testimoni: { delegate: prisma.testimoni as unknown as Delegate, skema: skemaTestimoni, urut: [{ urutan: "asc" }, { id: "desc" }], cari: ["nama", "isi"], tipeAudit: "testimoni" },
  faq: { delegate: prisma.faq as unknown as Delegate, skema: skemaFaq, urut: [{ urutan: "asc" }, { id: "desc" }], cari: ["pertanyaan"], tipeAudit: "faq" },
};

export type KonteksAksi = { userId: string; ip?: string };

const KOLOM_GAMBAR = ["gambar", "foto"] as const;

/** Hapus gambar hasil unggah yang tidak dipakai lagi (diganti atau barisnya dihapus). `baru` kosong = baris dihapus. */
async function bersihkanGambarLama(lama: Record<string, unknown>, baru?: Record<string, unknown>) {
  for (const kolom of KOLOM_GAMBAR) {
    const url = lama[kolom];
    if (typeof url === "string" && url && (!baru || baru[kolom] !== url)) await hapusMediaBila(url);
  }
}

function idDariString(id: string): bigint {
  if (!/^\d{1,18}$/.test(id)) throw GalatApi.tidakDitemukan();
  return BigInt(id);
}

function konfig(entitas: Entitas): Konfig {
  const k = KONFIG[entitas];
  if (!k) throw GalatApi.tidakDitemukan();
  return k;
}

export async function daftarKonten(entitas: Entitas, opsi: { q?: string; halaman?: number; per?: number } = {}) {
  const k = konfig(entitas);
  const per = Math.min(Math.max(opsi.per ?? 20, 1), 100);
  const halaman = Math.max(opsi.halaman ?? 1, 1);
  const where = opsi.q?.trim()
    ? { OR: k.cari.map((kolom) => ({ [kolom]: { contains: opsi.q!.trim(), mode: "insensitive" } })) }
    : undefined;

  const [data, total] = await Promise.all([
    k.delegate.findMany({ where, orderBy: k.urut, skip: (halaman - 1) * per, take: per }),
    k.delegate.count(where ? { where } : undefined),
  ]);
  return { data: serialisasi(data), total, halaman, per };
}

export async function ambilKonten(entitas: Entitas, id: string) {
  const baris = await konfig(entitas).delegate.findUnique({ where: { id: idDariString(id) } });
  if (!baris) throw GalatApi.tidakDitemukan();
  return serialisasi(baris);
}

function siapkan(k: Konfig, input: Baris): Baris {
  const data = { ...input };
  if (k.sanitasi && typeof data[k.sanitasi] === "string") data[k.sanitasi] = sanitasiHtml(data[k.sanitasi] as string);
  return data;
}

export async function buatKonten(entitas: Entitas, mentah: unknown, ctx: KonteksAksi) {
  const k = konfig(entitas);
  const input = siapkan(k, k.skema.parse(mentah) as Baris);

  if (k.slugDari) {
    input.slug = await slugUnik(String(input[k.slugDari]), async (s) => (await k.delegate.findUnique({ where: { slug: s } })) === null);
  }
  if (entitas === "berita" && input.isActive && !input.publishedAt) input.publishedAt = new Date();

  const baru = await k.delegate.create({ data: input });
  await catatAudit({ userId: ctx.userId, aksi: `${k.tipeAudit}.buat`, entitasTipe: k.tipeAudit, entitasId: String(baru.id), dataBaru: input, ip: ctx.ip });
  return serialisasi(baru);
}

export async function ubahKonten(entitas: Entitas, id: string, mentah: unknown, ctx: KonteksAksi) {
  const k = konfig(entitas);
  const lama = await k.delegate.findUnique({ where: { id: idDariString(id) } });
  if (!lama) throw GalatApi.tidakDitemukan();

  const input = siapkan(k, k.skema.parse(mentah) as Baris);
  if (entitas === "berita" && input.isActive && !input.publishedAt && !lama.publishedAt) input.publishedAt = new Date();
  // Slug tidak berubah saat judul diedit, supaya tautan lama tetap hidup.

  const baru = await k.delegate.update({ where: { id: lama.id }, data: input });
  await bersihkanGambarLama(lama, input);
  await catatAudit({ userId: ctx.userId, aksi: `${k.tipeAudit}.ubah`, entitasTipe: k.tipeAudit, entitasId: String(lama.id), dataLama: lama, dataBaru: input, ip: ctx.ip });
  return serialisasi(baru);
}

export async function hapusKonten(entitas: Entitas, id: string, ctx: KonteksAksi) {
  const k = konfig(entitas);
  const lama = await k.delegate.findUnique({ where: { id: idDariString(id) } });
  if (!lama) throw GalatApi.tidakDitemukan();

  await k.delegate.delete({ where: { id: lama.id } });
  await bersihkanGambarLama(lama);
  await catatAudit({ userId: ctx.userId, aksi: `${k.tipeAudit}.hapus`, entitasTipe: k.tipeAudit, entitasId: String(lama.id), dataLama: lama, ip: ctx.ip });
}

// ------------------------------------------------------------------- Jurusan

/** Kode jurusan tidak bisa diubah. Nonaktifkan lewat isActive. */
export async function ubahJurusan(kode: string, mentah: unknown, ctx: KonteksAksi) {
  const lama = await prisma.jurusan.findUnique({ where: { kode: kode.toUpperCase() } });
  if (!lama) throw GalatApi.tidakDitemukan();

  const input = skemaJurusan.parse(mentah);
  const baru = await prisma.jurusan.update({ where: { id: lama.id }, data: input });
  await bersihkanGambarLama(lama, input);
  await catatAudit({ userId: ctx.userId, aksi: "jurusan.ubah", entitasTipe: "jurusan", entitasId: lama.kode, dataLama: lama, dataBaru: input, ip: ctx.ip });
  return serialisasi(baru);
}

export async function ambilJurusanAdmin(kode: string) {
  const j = await prisma.jurusan.findUnique({ where: { kode: kode.toUpperCase() } });
  if (!j) throw GalatApi.tidakDitemukan();
  return serialisasi(j);
}
