import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";

// Daftar audit log untuk superadmin (PRD v3.1 13). Nilai sensitif sudah disamarkan saat ditulis.

export const PER_HALAMAN_AUDIT = 30;

export type FilterAudit = { aksi?: string; oleh?: string; entitas?: string; q?: string; dari?: string; sampai?: string; halaman?: number };

const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const tanggal = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined);

export function bacaFilterAudit(sp: Record<string, string | string[] | undefined>): FilterAudit {
  const h = Number(satu(sp.halaman));
  return {
    aksi: satu(sp.aksi)?.slice(0, 60) || undefined,
    oleh: /^\d{1,18}$/.test(satu(sp.oleh) ?? "") ? satu(sp.oleh) : undefined,
    entitas: satu(sp.entitas)?.slice(0, 40) || undefined,
    q: satu(sp.q)?.trim().slice(0, 60) || undefined,
    dari: tanggal(satu(sp.dari)),
    sampai: tanggal(satu(sp.sampai)),
    halaman: Number.isInteger(h) && h > 0 ? h : 1,
  };
}

export async function daftarAudit(f: FilterAudit) {
  const and: Prisma.AuditLogWhereInput[] = [];
  if (f.aksi) and.push({ aksi: f.aksi });
  if (f.oleh) and.push({ userId: BigInt(f.oleh) });
  if (f.entitas) and.push({ entitasTipe: f.entitas });
  if (f.q) and.push({ entitasId: { contains: f.q } });
  if (f.dari) and.push({ createdAt: { gte: new Date(`${f.dari}T00:00:00+07:00`) } });
  if (f.sampai) and.push({ createdAt: { lt: new Date(new Date(`${f.sampai}T00:00:00+07:00`).getTime() + 86400_000) } });
  const where: Prisma.AuditLogWhereInput = { AND: and };
  const halaman = Math.max(f.halaman ?? 1, 1);

  const [baris, total, aksi, entitas, pengguna] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (halaman - 1) * PER_HALAMAN_AUDIT,
      take: PER_HALAMAN_AUDIT,
      include: { user: { select: { name: true, username: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["aksi"], select: { aksi: true }, orderBy: { aksi: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["entitasTipe"], select: { entitasTipe: true }, where: { entitasTipe: { not: null } }, orderBy: { entitasTipe: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true, username: true }, orderBy: { name: "asc" } }),
  ]);

  return {
    baris: baris.map((b) => ({
      id: b.id.toString(),
      waktu: b.createdAt,
      oleh: b.user ? `${b.user.name} (${b.user.username})` : "Sistem",
      aksi: b.aksi,
      entitas: b.entitasTipe ? `${b.entitasTipe}${b.entitasId ? `:${b.entitasId}` : ""}` : "-",
      ip: b.ip,
      dataLama: b.dataLama as unknown,
      dataBaru: b.dataBaru as unknown,
    })),
    total,
    halaman,
    jumlahHalaman: Math.max(1, Math.ceil(total / PER_HALAMAN_AUDIT)),
    pilihan: {
      aksi: aksi.map((a) => a.aksi),
      entitas: entitas.map((e) => e.entitasTipe as string),
      pengguna: pengguna.map((u) => ({ id: u.id.toString(), nama: `${u.name} (${u.username})` })),
    },
  };
}

/** Ringkasan penggunaan OCR dari tabel OcrHasil (PRD v4 13.11). OCR berjalan di perangkat pendaftar, jadi tidak ada kuota. */
export async function statistikOcr() {
  const baris = await prisma.ocrHasil.findMany({ select: { jenis: true, provider: true, sukses: true, durasiMs: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 20000 });
  const persentil = (urut: number[], p: number) => (urut.length === 0 ? 0 : urut[Math.min(urut.length - 1, Math.ceil((p / 100) * urut.length) - 1)]);
  const awalBulan = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const perJenis = ["akta", "kk", "rapor"].map((jenis) => {
    const b = baris.filter((x) => x.jenis === jenis);
    const durasi = b.map((x) => x.durasiMs).sort((a, c) => a - c);
    return {
      jenis,
      jumlah: b.length,
      sukses: b.filter((x) => x.sukses).length,
      p50: persentil(durasi, 50),
      p95: persentil(durasi, 95),
    };
  });
  return { total: baris.length, bulanIni: baris.filter((x) => x.createdAt >= awalBulan).length, perJenis };
}
