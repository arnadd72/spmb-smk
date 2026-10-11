import { Readable } from "node:stream";
import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { penyimpananDokumen, penyimpananTemp } from "@/server/services/penyimpanan";
import { statusDrive } from "@/server/services/penyimpanan/driveOAuth";
import { pindahkanKeDrive } from "@/server/services/pendaftaran";
import type { Berkas, BerkasDraf } from "@/server/services/draf";
import { GalatApi } from "@/server/types/galat";
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
    await pindahkanKeDrive(p.nomorPendaftaran, p.namaLengkap, p.periode, (p.berkasMeta ?? {}) as BerkasDraf);
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
