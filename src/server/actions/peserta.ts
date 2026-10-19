import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { konteksValidasi, validasiLangkah, type KonteksValidasi } from "@/server/services/draf";
import {
  KOLOM_DIKENAL,
  KOLOM_TERENKRIPSI,
  bukaAman,
  camel,
  nomorWa,
  samarkan,
  susunKolom,
} from "@/server/services/pendaftarKolom";
import { kondisiPeserta, type FilterPeserta } from "@/server/services/pencarianPeserta";
import { GalatApi } from "@/server/types/galat";
import type { DefinisiField } from "@/server/validasi/wizard";
import type { KonteksAksi } from "./konten";

export { bacaFilter, kondisiPeserta, type FilterPeserta } from "@/server/services/pencarianPeserta";

// Data peserta untuk panel admin (PRD v3.1 13.3 dan 13.5): daftar, detail, edit dengan audit.

export const PER_HALAMAN = 20;

export type BarisPeserta = {
  id: string;
  nomor: string;
  nama: string;
  nisn: string | null;
  asalSekolah: string | null;
  jurusan: string | null;
  status: string;
  statusNilai: string;
  sumber: string;
  sinkron: string;
  nik: string;
  hp: string;
  dikirim: Date;
};

export type HasilDaftarPeserta = {
  baris: BarisPeserta[];
  total: number;
  halaman: number;
  jumlahHalaman: number;
  periodeAktif: string;
};

const URUTAN: Record<NonNullable<FilterPeserta["urut"]>, string> = {
  dikirim: "createdAt",
  nama: "namaLengkap",
  nomor: "nomorPendaftaran",
  status: "statusVerifikasi",
};

export async function daftarPeserta(f: FilterPeserta, periodeAktif: string): Promise<HasilDaftarPeserta> {
  const where = kondisiPeserta(f, periodeAktif);
  const urut = URUTAN[f.urut ?? "dikirim"];
  const arah = f.arah ?? "desc";
  const halaman = Math.max(f.halaman ?? 1, 1);

  const [baris, total] = await Promise.all([
    prisma.pendaftar.findMany({
      where,
      orderBy: [{ [urut]: arah }, { id: "desc" }],
      skip: (halaman - 1) * PER_HALAMAN,
      take: PER_HALAMAN,
      include: { jurusan1: { select: { kode: true } } },
    }),
    prisma.pendaftar.count({ where }),
  ]);

  return {
    baris: baris.map((p) => ({
      id: p.id.toString(),
      nomor: p.nomorPendaftaran,
      nama: p.namaLengkap,
      nisn: p.nisn,
      asalSekolah: p.asalSekolah,
      jurusan: p.jurusan1?.kode ?? null,
      status: p.statusVerifikasi,
      statusNilai: p.statusNilai,
      sumber: p.sumber,
      sinkron: p.berkasSinkron,
      nik: samarkan(bukaAman(p.nik), 4, 4),
      hp: samarkan(bukaAman(p.noHp), 4, 3),
      dikirim: p.createdAt,
    })),
    total,
    halaman,
    jumlahHalaman: Math.max(1, Math.ceil(total / PER_HALAMAN)),
    periodeAktif,
  };
}

// ------------------------------------------------------------------ detail

export function idPendaftar(id: string): bigint {
  if (!/^\d{1,18}$/.test(id)) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");
  return BigInt(id);
}

const ISO = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/** Nilai awal form edit/detail: kunci snake_case -> nilai teks, dengan data sensitif sudah didekripsi. */
export function nilaiPendaftar(p: Record<string, unknown>, jurusan: { j1?: string | null; j2?: string | null }): Record<string, unknown> {
  const hasil: Record<string, unknown> = {};
  for (const kunci of KOLOM_DIKENAL) {
    const nilai = p[camel(kunci)];
    if (kunci === "tanggal_lahir" || kunci === "ayah_tanggal_lahir" || kunci === "ibu_tanggal_lahir") hasil[kunci] = ISO(nilai as Date | null);
    else if (KOLOM_TERENKRIPSI.has(kunci)) hasil[kunci] = bukaAman(nilai as string | null) ?? "";
    else hasil[kunci] = nilai === null || nilai === undefined ? "" : nilai;
  }
  // Isian kustom dari form builder tersimpan di dataKustom.
  Object.assign(hasil, (p.dataKustom ?? {}) as Record<string, unknown>);
  hasil.jurusan_1 = jurusan.j1 ?? "";
  hasil.jurusan_2 = jurusan.j2 ?? "";
  return hasil;
}

export async function ambilPeserta(id: string) {
  const p = await prisma.pendaftar.findUnique({
    where: { id: idPendaftar(id) },
    include: { jurusan1: true, jurusan2: true, rekomendasi: true, diverifikasiOleh: { select: { name: true } } },
  });
  if (!p) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");

  const riwayat = await prisma.auditLog.findMany({
    where: { entitasTipe: "pendaftar", entitasId: p.id.toString() },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  });

  const nilai = nilaiPendaftar(p as unknown as Record<string, unknown>, { j1: p.jurusan1?.kode, j2: p.jurusan2?.kode });
  const hp = (nilai.no_hp as string) || "";
  const wa = (nilai.no_wa as string) || hp;

  return {
    id: p.id.toString(),
    nomor: p.nomorPendaftaran,
    periode: p.periode,
    sumber: p.sumber,
    status: p.statusVerifikasi,
    statusNilai: p.statusNilai,
    catatanVerifikasi: p.catatanVerifikasi,
    catatanPenolakan: p.catatanPenolakan,
    diverifikasiOleh: p.diverifikasiOleh?.name ?? null,
    diverifikasiAt: p.diverifikasiAt,
    dikirim: p.createdAt,
    nilai,
    waLink: wa ? `https://wa.me/${nomorWa(wa)}` : null,
    jurusan1: p.jurusan1 ? { kode: p.jurusan1.kode, nama: p.jurusan1.nama } : null,
    jurusan2: p.jurusan2 ? { kode: p.jurusan2.kode, nama: p.jurusan2.nama } : null,
    rekomendasi: p.rekomendasi ? { kode: p.rekomendasi.kode, nama: p.rekomendasi.nama } : null,
    rekomendasiSkor: p.rekomendasiSkor as unknown,
    rekomendasiVersi: p.rekomendasiVersi,
    nilaiRapor: p.nilaiRapor as unknown,
    nilaiRaporSumber: p.nilaiRaporSumber,
    nilaiRaporKoreksi: p.nilaiRaporKoreksi as unknown,
    berkasSinkron: p.berkasSinkron,
    berkasMeta: p.berkasMeta as unknown,
    dataKustom: (p.dataKustom ?? {}) as Record<string, unknown>,
    riwayat: riwayat.map((r) => ({
      id: r.id.toString(),
      aksi: r.aksi,
      oleh: r.user?.name ?? "Sistem",
      waktu: r.createdAt,
      dataLama: r.dataLama as Record<string, unknown> | null,
      dataBaru: r.dataBaru as Record<string, unknown> | null,
    })),
  };
}

// ------------------------------------------------------------------ edit

const LANGKAH_EDIT = [1, 4, 5, 6, 7];

/** Field yang bisa diedit admin: langkah 1, 4, 5, 6, 7 dari form builder (tanpa berkas, nilai rapor, dan persetujuan). */
export function fieldEdit(fields: DefinisiField[]): DefinisiField[] {
  return fields.filter((f) => LANGKAH_EDIT.includes(f.langkah) && f.tipe !== "file" && f.kunci !== "setuju" && f.kunci !== "konfirmasi_final");
}

/** Serialisasi dengan urutan kunci tetap (jsonb tidak menjaga urutan), untuk membandingkan nilai. */
function stabil(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stabil).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stabil((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v ?? "");
}

const samarkanAudit = (kunci: string, v: unknown) => (KOLOM_TERENKRIPSI.has(kunci) && typeof v === "string" ? samarkan(v, 2, 2) : v);

/** Validasi dengan aturan yang sama seperti wizard, lalu simpan hanya yang berubah dan catat audit lama/baru. */
export async function ubahPeserta(id: string, masukan: unknown, ctx: KonteksAksi) {
  const pid = idPendaftar(id);
  const lama = await prisma.pendaftar.findUnique({ where: { id: pid }, include: { jurusan1: true, jurusan2: true } });
  if (!lama) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");

  const mentah = { ...((masukan ?? {}) as Record<string, unknown>), setuju: true };
  const konteks: KonteksValidasi = await konteksValidasi();
  const hasil: Record<string, unknown> = {};
  const galat: Record<string, string[]> = {};
  for (const n of LANGKAH_EDIT) {
    try {
      Object.assign(hasil, validasiLangkah(n, mentah, {}, konteks));
    } catch (e) {
      if (e instanceof GalatApi && e.errors) Object.assign(galat, e.errors);
      else throw e;
    }
  }
  if (Object.keys(galat).length > 0) throw GalatApi.validasi(galat);

  const jurusan = await prisma.jurusan.findMany({ where: { kode: { in: [String(hasil.jurusan_1), String(hasil.jurusan_2 ?? "")] } } });
  const j1 = jurusan.find((j) => j.kode === hasil.jurusan_1);
  if (!j1) throw GalatApi.validasi({ jurusan_1: ["Pilihan jurusan tidak valid."] });
  const j2 = hasil.jurusan_2 ? jurusan.find((j) => j.kode === hasil.jurusan_2) : undefined;

  const sebelum = nilaiPendaftar(lama as unknown as Record<string, unknown>, { j1: lama.jurusan1?.kode, j2: lama.jurusan2?.kode });
  const sesudah: Record<string, unknown> = {};
  const dataLama: Record<string, unknown> = {};
  const dataBaru: Record<string, unknown> = {};
  for (const [kunci, nilai] of Object.entries(hasil)) {
    if (kunci === "setuju") continue;
    const awal = sebelum[kunci];
    const akhir = kunci === "tanggal_lahir" ? String(nilai) : nilai;
    const sama = stabil(awal) === stabil(akhir);
    if (sama) continue;
    sesudah[kunci] = nilai;
    dataLama[kunci] = samarkanAudit(kunci, awal);
    dataBaru[kunci] = samarkanAudit(kunci, akhir);
  }
  if (Object.keys(sesudah).length === 0) return { berubah: [] as string[] };

  // Tulis hanya kolom milik field yang berubah.
  const { kolom: kolomBerubah, kustom: kustomBerubah } = susunKolom(sesudah);
  const data: Record<string, unknown> = { ...kolomBerubah };
  // Field opsional yang dikosongkan: tulis null (susunKolom melewati nilai undefined).
  for (const [k, v] of Object.entries(sesudah)) {
    if (v !== undefined || !KOLOM_DIKENAL.has(k)) continue;
    data[camel(k)] = null;
    if (k === "nik") data.nikHash = null;
    if (k === "no_hp") data.noHpHash = null;
  }
  if ("jurusan_1" in sesudah) data.jurusan1Id = j1.id;
  if ("jurusan_2" in sesudah) data.jurusan2Id = j2?.id ?? null;
  if (Object.keys(kustomBerubah).length > 0) data.dataKustom = { ...((lama.dataKustom ?? {}) as object), ...kustomBerubah };

  await prisma.pendaftar.update({ where: { id: pid }, data: data as Prisma.PendaftarUpdateInput });
  await catatAudit({
    userId: ctx.userId,
    aksi: "pendaftar.ubah",
    entitasTipe: "pendaftar",
    entitasId: pid.toString(),
    dataLama,
    dataBaru,
    ip: ctx.ip,
  });
  return { berubah: Object.keys(sesudah) };
}
