import { Readable } from "node:stream";
import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { penyimpananDokumen, penyimpananTemp } from "@/server/services/penyimpanan";
import { statusDrive } from "@/server/services/penyimpanan/driveOAuth";
import { pindahkanKeDrive } from "@/server/services/pendaftaran";
import { MAKS_BERKAS_RAPOR, MAKS_UKURAN_BYTE, deteksiMime, type Berkas, type BerkasDraf } from "@/server/services/draf";
import { buatTokenAcak } from "@/server/services/kripto";
import { GalatApi } from "@/server/types/galat";
import type { Prisma } from "@/generated/prisma/client";
import { idPendaftar } from "./peserta";
import type { KonteksAksi } from "./konten";

// Penampil berkas pendaftar untuk panitia (PRD v4 13.4): berkas tidak punya URL publik, selalu lewat backend.
// Sumber: Google Drive bila sudah tersinkron, selain itu penyimpanan sementara ("Menunggu unggah ke Drive").

export type DeskripsiBerkas = {
  kunci: string;
  indeks: number;
  label: string;
  nama: string;
  mime: string;
  ukuran: number;
  sumber: "drive" | "sementara" | "hilang";
};

const MIME_AMAN = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const LABEL: Record<string, string> = { akta: "Akta kelahiran", kk: "Kartu keluarga", rapor: "Rapor" };

type Baris = {
  berkasMeta: unknown;
  aktaFileId: string | null;
  kkFileId: string | null;
  raporFileIds: unknown;
  kustomFileIds: unknown;
};

function idDrive(p: Baris, kunci: string, i: number): string | null {
  if (kunci === "akta") return p.aktaFileId;
  if (kunci === "kk") return p.kkFileId;
  if (kunci === "rapor") return Array.isArray(p.raporFileIds) ? ((p.raporFileIds[i] as string | undefined) ?? null) : null;
  const k = (p.kustomFileIds ?? {}) as Record<string, string | string[]>;
  const v = k[kunci];
  return Array.isArray(v) ? (v[i] ?? null) : (v ?? null);
}

function daftarMeta(p: Baris): { kunci: string; indeks: number; b: Berkas }[] {
  const meta = (p.berkasMeta ?? {}) as BerkasDraf;
  return Object.entries(meta).flatMap(([kunci, v]) => (Array.isArray(v) ? v.map((b, indeks) => ({ kunci, indeks, b })) : v ? [{ kunci, indeks: 0, b: v }] : []));
}

export async function daftarBerkasPendaftar(p: Baris): Promise<DeskripsiBerkas[]> {
  const temp = penyimpananTemp();
  const hasil: DeskripsiBerkas[] = [];
  for (const { kunci, indeks, b } of daftarMeta(p)) {
    let sumber: DeskripsiBerkas["sumber"] = "hilang";
    if (idDrive(p, kunci, indeks)) sumber = "drive";
    else if (await temp.ada(b.ref).catch(() => false)) sumber = "sementara";
    const jumlah = daftarMeta(p).filter((x) => x.kunci === kunci).length;
    hasil.push({
      kunci,
      indeks,
      label: `${LABEL[kunci] ?? kunci}${jumlah > 1 ? ` ${indeks + 1}` : ""}`,
      nama: b.nama,
      mime: b.mime,
      ukuran: b.ukuran,
      sumber,
    });
  }
  return hasil;
}

/** Daftar berkas satu pendaftar beserta sumbernya (Drive, sementara, atau hilang). */
export async function ambilBerkasPendaftar(id: string): Promise<DeskripsiBerkas[]> {
  const p = await prisma.pendaftar.findUnique({
    where: { id: idPendaftar(id) },
    select: { berkasMeta: true, aktaFileId: true, kkFileId: true, raporFileIds: true, kustomFileIds: true },
  });
  if (!p) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");
  return daftarBerkasPendaftar(p);
}

/** Aliran berkas untuk dilihat panitia. Setiap pembukaan dicatat di audit. */
export async function bukaBerkas(id: string, kunci: string, indeks: number, ctx: KonteksAksi) {
  const pid = idPendaftar(id);
  const p = await prisma.pendaftar.findUnique({
    where: { id: pid },
    select: { id: true, berkasMeta: true, aktaFileId: true, kkFileId: true, raporFileIds: true, kustomFileIds: true },
  });
  if (!p) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");

  const item = daftarMeta(p).find((x) => x.kunci === kunci && x.indeks === indeks);
  if (!item) throw GalatApi.tidakDitemukan("Berkas tidak ditemukan.");

  let aliran: Readable | null = null;
  const dId = idDrive(p, kunci, indeks);
  if (dId) aliran = await (await penyimpananDokumen()).ambilStream(dId);
  else {
    const temp = penyimpananTemp();
    if (await temp.ada(item.b.ref).catch(() => false)) aliran = await temp.ambilStream(item.b.ref);
  }
  if (!aliran) throw GalatApi.tidakDitemukan("Berkas belum tersedia. Coba sinkron ulang ke Drive.");

  await catatAudit({ userId: ctx.userId, aksi: "pendaftar.berkas_lihat", entitasTipe: "pendaftar", entitasId: pid.toString(), dataBaru: { berkas: kunci, indeks }, ip: ctx.ip });
  const mime = MIME_AMAN.has(item.b.mime) ? item.b.mime : "application/octet-stream";
  return { aliran, mime, nama: item.b.nama };
}

// ------------------------------------------------------------------ sinkron ulang ke Drive

export type HasilSinkron = { nomor: string; status: "selesai" | "menunggu" | "gagal"; pesan?: string };

/** Pindahkan ulang berkas satu pendaftar ke Drive. Gagal tidak melempar: status dicatat di baris pendaftar. */
export async function sinkronBerkasPendaftar(id: string, ctx?: KonteksAksi): Promise<HasilSinkron> {
  const pid = idPendaftar(id);
  const p = await prisma.pendaftar.findUnique({ where: { id: pid } });
  if (!p) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");
  if (p.berkasSinkron === "selesai") return { nomor: p.nomorPendaftaran, status: "selesai" };

  const drive = await statusDrive().catch(() => ({ terhubung: false }));
  if (!drive.terhubung) {
    return { nomor: p.nomorPendaftaran, status: "menunggu", pesan: "Google Drive belum terhubung. Hubungkan dari menu Pengaturan." };
  }

  try {
    await pindahkanKeDrive(p.nomorPendaftaran);
    if (ctx) await catatAudit({ userId: ctx.userId, aksi: "pendaftar.sinkron", entitasTipe: "pendaftar", entitasId: pid.toString(), ip: ctx.ip });
    return { nomor: p.nomorPendaftaran, status: "selesai" };
  } catch (e) {
    await prisma.pendaftar.update({ where: { id: pid }, data: { berkasSinkron: "gagal" } });
    return { nomor: p.nomorPendaftaran, status: "gagal", pesan: e instanceof Error ? e.message : "Gagal mengunggah ke Drive." };
  }
}

/** Sinkron ulang semua yang menunggu atau gagal (tombol di pengaturan dan dashboard). */
export async function sinkronSemuaTertunda(ctx?: KonteksAksi, batas = 25) {
  const tertunda = await prisma.pendaftar.findMany({
    where: { berkasSinkron: { in: ["menunggu", "gagal"] } },
    orderBy: { createdAt: "asc" },
    take: batas,
    select: { id: true },
  });
  const hasil: HasilSinkron[] = [];
  for (const t of tertunda) hasil.push(await sinkronBerkasPendaftar(t.id.toString(), ctx));
  return {
    diproses: hasil.length,
    selesai: hasil.filter((h) => h.status === "selesai").length,
    gagal: hasil.filter((h) => h.status === "gagal").length,
    menunggu: hasil.filter((h) => h.status === "menunggu").length,
  };
}

// ------------------------------------------------------------------ ganti, tambah, hapus berkas oleh panitia

const KUNCI_ADMIN = ["akta", "kk", "rapor"] as const;

const bersihNama = (nama: string) => nama.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "berkas";

async function hapusDariDrive(idBerkas: string | null | undefined) {
  if (!idBerkas) return;
  try {
    await (await penyimpananDokumen()).hapus(idBerkas);
  } catch {
    // Drive terputus: berkas lama tertinggal di Drive, tetapi tidak lagi dirujuk pendaftar.
  }
}

function adaYangTertunda(meta: BerkasDraf, p: { aktaFileId: string | null; kkFileId: string | null; raporFileIds: unknown; kustomFileIds?: unknown }): boolean {
  const kustom = (p.kustomFileIds ?? {}) as Record<string, string>;
  for (const [k, v] of Object.entries(meta)) if (v && !["akta", "kk", "rapor"].includes(k) && !kustom[k]) return true;
  const rapor = Array.isArray(p.raporFileIds) ? (p.raporFileIds as (string | null)[]) : [];
  if (meta.akta && !p.aktaFileId) return true;
  if (meta.kk && !p.kkFileId) return true;
  return Array.isArray(meta.rapor) && meta.rapor.some((_, i) => !rapor[i]);
}

/** Ganti Akta/KK atau tambah halaman Rapor. Isi diperiksa dari byte, bukan dari nama atau tipe kiriman. */
export async function unggahBerkasPendaftar(id: string, kunci: string, isi: Buffer, namaAsli: string, ctx: KonteksAksi): Promise<DeskripsiBerkas[]> {
  if (!(KUNCI_ADMIN as readonly string[]).includes(kunci)) throw GalatApi.validasi({ berkas: ["Jenis berkas tidak dikenal."] });
  if (isi.length === 0) throw GalatApi.validasi({ berkas: ["Berkas kosong."] });
  if (isi.length > MAKS_UKURAN_BYTE) throw GalatApi.validasi({ berkas: ["Ukuran berkas melebihi 5 MB."] });
  const jenis = deteksiMime(isi);
  if (!jenis) throw GalatApi.validasi({ berkas: ["Format berkas harus JPG, PNG, WebP, atau PDF."] });

  const pid = idPendaftar(id);
  const p = await prisma.pendaftar.findUnique({ where: { id: pid } });
  if (!p) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");
  const meta = { ...((p.berkasMeta ?? {}) as BerkasDraf) };
  const temp = penyimpananTemp();
  const baru: Berkas = {
    ref: await temp.simpan(`admin/${p.nomorPendaftaran}/${kunci}-${buatTokenAcak(8)}.${jenis.ext}`, isi, jenis.mime),
    nama: bersihNama(namaAsli),
    mime: jenis.mime,
    ukuran: isi.length,
  };

  const data: Prisma.PendaftarUpdateInput = { berkasSinkron: "menunggu" };
  if (kunci === "rapor") {
    const daftar = Array.isArray(meta.rapor) ? [...meta.rapor] : [];
    if (daftar.length >= MAKS_BERKAS_RAPOR) {
      await temp.hapus(baru.ref).catch(() => undefined);
      throw GalatApi.validasi({ berkas: [`Maksimal ${MAKS_BERKAS_RAPOR} berkas rapor.`] });
    }
    meta.rapor = [...daftar, baru];
    data.raporFileIds = [...(Array.isArray(p.raporFileIds) ? (p.raporFileIds as (string | null)[]) : []), null];
  } else {
    const lama = meta[kunci] as Berkas | undefined;
    if (lama) await temp.hapus(lama.ref).catch(() => undefined);
    await hapusDariDrive(kunci === "akta" ? p.aktaFileId : p.kkFileId);
    meta[kunci] = baru;
    if (kunci === "akta") data.aktaFileId = null;
    else data.kkFileId = null;
  }
  data.berkasMeta = JSON.parse(JSON.stringify(meta));
  await prisma.pendaftar.update({ where: { id: pid }, data });
  await catatAudit({ userId: ctx.userId, aksi: "pendaftar.berkas_unggah", entitasTipe: "pendaftar", entitasId: pid.toString(), dataBaru: { berkas: kunci, nama: baru.nama }, ip: ctx.ip });

  await sinkronBerkasPendaftar(id).catch(() => undefined); // coba langsung ke Drive; bila belum bisa, tetap menunggu
  return ambilBerkasPendaftar(id);
}

export async function hapusBerkasPendaftar(id: string, kunci: string, indeks: number, ctx: KonteksAksi): Promise<DeskripsiBerkas[]> {
  const pid = idPendaftar(id);
  const p = await prisma.pendaftar.findUnique({ where: { id: pid } });
  if (!p) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");
  const meta = { ...((p.berkasMeta ?? {}) as BerkasDraf) };
  const temp = penyimpananTemp();

  const data: Prisma.PendaftarUpdateInput = {};
  let nama: string | undefined;
  if (kunci === "rapor" && Array.isArray(meta.rapor) && meta.rapor[indeks]) {
    const [b] = meta.rapor.splice(indeks, 1);
    nama = b.nama;
    const ids = Array.isArray(p.raporFileIds) ? [...(p.raporFileIds as (string | null)[])] : [];
    const [idLama] = ids.splice(indeks, 1);
    await temp.hapus(b.ref).catch(() => undefined);
    await hapusDariDrive(idLama);
    data.raporFileIds = ids;
  } else if ((kunci === "akta" || kunci === "kk") && meta[kunci] && !Array.isArray(meta[kunci])) {
    const b = meta[kunci] as Berkas;
    nama = b.nama;
    await temp.hapus(b.ref).catch(() => undefined);
    await hapusDariDrive(kunci === "akta" ? p.aktaFileId : p.kkFileId);
    delete meta[kunci];
    if (kunci === "akta") data.aktaFileId = null;
    else data.kkFileId = null;
  } else {
    throw GalatApi.tidakDitemukan("Berkas tidak ditemukan.");
  }

  const sesudah = {
    aktaFileId: kunci === "akta" ? null : p.aktaFileId,
    kkFileId: kunci === "kk" ? null : p.kkFileId,
    raporFileIds: (data.raporFileIds as unknown) ?? p.raporFileIds,
    kustomFileIds: p.kustomFileIds,
  };
  data.berkasMeta = JSON.parse(JSON.stringify(meta));
  data.berkasSinkron = adaYangTertunda(meta, sesudah) ? "menunggu" : "selesai";
  await prisma.pendaftar.update({ where: { id: pid }, data });
  await catatAudit({ userId: ctx.userId, aksi: "pendaftar.berkas_hapus", entitasTipe: "pendaftar", entitasId: pid.toString(), dataLama: { berkas: kunci, nama }, ip: ctx.ip });
  return ambilBerkasPendaftar(id);
}
