// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-ops-"));

import { buatPendaftarManual } from "@/server/actions/inputManual";
import { ambilKuota, simpanKuota } from "@/server/actions/kuota";
import { ambilPeserta, daftarPeserta, fieldEdit } from "@/server/actions/peserta";
import { prisma } from "@/server/db/client";
import { buatDraf, muatDefinisiField, rekomendasiDraf } from "@/server/services/draf";
import { kirimPendaftaran } from "@/server/services/pendaftaran";
import { simpanPengaturan } from "@/server/services/pengaturan";
import type { GalatApi } from "@/server/types/galat";
import { seedFormField, seedReferensi } from "../../prisma/seed-lib";
import { buatPendaftarUji } from "../fixture-pendaftar";
import { isiLengkap, nilaiValid } from "../fixture-wizard";

const ctx = { userId: "1", ip: "127.0.0.1" };

async function bersih() {
  await prisma.pendaftar.deleteMany();
  await prisma.pendaftaranDraft.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.pengaturan.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => {
  await seedReferensi(prisma);
  await seedFormField(prisma);
});
beforeEach(async () => {
  await bersih();
  await prisma.user.create({ data: { id: BigInt(1), name: "Panitia Uji", username: "panitia-uji", passwordHash: "x", peran: "panitia" } });
  await simpanPengaturan("tahun_ajaran", "2027/2028");
  await prisma.jurusan.updateMany({ data: { kuota: 72 } });
});
afterAll(async () => {
  await bersih();
  // test ini mengubah kuota jurusan: hapus referensi supaya seed.test memulai dari keadaan bersih
  await prisma.bobotJurusan.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.jurusan.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.$disconnect();
});

const galat = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as GalatApi;
  }
  throw new Error("Seharusnya melempar galat.");
};

describe("kuota", () => {
  it("menghitung terdaftar per jurusan pilihan 1 untuk periode aktif, tanpa yang ditolak", async () => {
    const akl = await prisma.jurusan.findUniqueOrThrow({ where: { kode: "AKL" } });
    await buatPendaftarUji({ nomor: "SPMB-2027-0001", jurusan1Id: akl.id });
    await buatPendaftarUji({ nomor: "SPMB-2027-0002", jurusan1Id: akl.id, status: "approved" });
    await buatPendaftarUji({ nomor: "SPMB-2027-0003", jurusan1Id: akl.id, status: "rejected" });
    await buatPendaftarUji({ nomor: "SPMB-2026-0001", jurusan1Id: akl.id, periode: "2026/2027" });

    const { periode, baris } = await ambilKuota();
    expect(periode).toBe("2027/2028");
    const b = baris.find((x) => x.kode === "AKL")!;
    expect([b.kuota, b.terdaftar, b.sisa, b.persen]).toEqual([72, 2, 70, 3]);
  });

  it("simpan massal: hanya yang berubah, dicatat di audit lama/baru", async () => {
    const h = await simpanKuota({ kuota: { AKL: 80, MPLB: 72, LPK3: "60", TKR: 72 } }, ctx);
    expect(h.berubah.sort()).toEqual(["AKL", "LPK3"]);
    expect((await prisma.jurusan.findUniqueOrThrow({ where: { kode: "LPK3" } })).kuota).toBe(60);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { aksi: "kuota.ubah" } });
    expect(audit.dataLama).toEqual({ AKL: 72, LPK3: 72 });
    expect(audit.dataBaru).toEqual({ AKL: 80, LPK3: 60 });
    expect((await simpanKuota({ kuota: { AKL: 80 } }, ctx)).berubah).toEqual([]);
  });

  it("menolak nilai tak sah atau jurusan tak dikenal, dan tidak mengubah apa pun", async () => {
    await expect(simpanKuota({ kuota: { AKL: -1 } }, ctx)).rejects.toThrow();
    await expect(simpanKuota({ kuota: { AKL: 1001 } }, ctx)).rejects.toThrow();
    await expect(simpanKuota({ kuota: { AKL: 1.5 } }, ctx)).rejects.toThrow();
    await expect(simpanKuota({ kuota: { AKL: "abc" } }, ctx)).rejects.toThrow();
    const e = await galat(simpanKuota({ kuota: { AKL: 99, XYZ: 10 } }, ctx));
    expect(e.status).toBe(422);
    expect((await prisma.jurusan.findUniqueOrThrow({ where: { kode: "AKL" } })).kuota).toBe(72);
  });

  it("wizard memberi tahu kuota penuh mengikuti definisi yang sama", async () => {
    // Draf diisi dulu: sejak PRD 1.3 butir 62 memilih jurusan yang sudah penuh ditolak.
    const { token } = await buatDraf();
    await isiLengkap(token);
    await prisma.jurusan.update({ where: { kode: "AKL" }, data: { kuota: 1 } });
    const akl = await prisma.jurusan.findUniqueOrThrow({ where: { kode: "AKL" } });
    await buatPendaftarUji({ nomor: "SPMB-2027-0001", jurusan1Id: akl.id });
    expect((await rekomendasiDraf(token)).kuotaPenuh).toEqual(["AKL"]);
  });
});

describe("input manual pendaftar luring", () => {
  async function isianValid(): Promise<Record<string, unknown>> {
    const fields = fieldEdit(await muatDefinisiField());
    const isi: Record<string, unknown> = {};
    for (const f of fields) if (f.tipe !== "tabel") isi[f.kunci] = nilaiValid(f);
    isi.nama_lengkap = "Peserta Luring";
    return isi;
  }

  it("membuat pendaftar luring berstatus diterima dengan nomor yang melanjutkan urutan wizard", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token);
    expect((await kirimPendaftaran(token, true)).nomor).toBe("SPMB-2027-0001");

    const isi = await isianValid();
    const h = await buatPendaftarManual({ ...isi, jurusan_1: "TKR", jurusan_2: "" }, ctx);
    expect(h.nomor).toBe("SPMB-2027-0002");

    const p = await prisma.pendaftar.findUniqueOrThrow({ where: { id: BigInt(h.id) }, include: { jurusan1: true, rekomendasi: true } });
    expect([p.sumber, p.statusVerifikasi]).toEqual(["luring", "approved"]);
    expect(p.jurusan1?.kode).toBe("TKR");
    expect(p.jurusan2Id).toBeNull();
    expect(p.diverifikasiOlehId).toBe(BigInt(1));
    // Tanpa nilai rapor dan tanpa tes minat bakat (hanya di wizard daring): tidak ada saran jurusan (PRD 1.3 butir 65).
    expect(p.rekomendasi).toBeNull();
    expect(p.rekomendasiSkor).toEqual([]);
    expect(p.nilaiRapor).toEqual({});
    expect(p.berkasSinkron).toBe("selesai"); // belum ada berkas: tidak ada yang perlu disinkronkan
    expect(p.nik).not.toBe("3302010101010001");

    const d = await ambilPeserta(h.id);
    expect(d.nilai.nik).toBe("3302010101010001");
    expect(await prisma.auditLog.count({ where: { aksi: "pendaftar.input_manual" } })).toBe(1);
    // terlihat di daftar dan bisa dicari lewat NIK
    expect((await daftarPeserta({ q: "3302010101010001", sumber: "luring" }, "2027/2028")).baris.map((b) => b.nomor)).toEqual(["SPMB-2027-0002"]);
  });

  it("saran jurusan kosong; tetap langsung diterima walau diminta menunggu", async () => {
    // status_awal tidak dikenal lagi (PRD 1.3 butir 62): semua pendaftar langsung diterima.
    const h = await buatPendaftarManual({ ...(await isianValid()), jurusan_1: "AKL", status_awal: "pending" }, ctx);
    const p = await prisma.pendaftar.findUniqueOrThrow({ where: { id: BigInt(h.id) } });
    expect([p.statusVerifikasi, p.statusNilai, p.rekomendasiJurusanId]).toEqual(["approved", "belumDicek", null]);
    expect(p.rekomendasiSkor).toEqual([]);
  });

  it("data tidak valid ditolak dengan galat per field dan tidak membuat apa pun", async () => {
    const isi = await isianValid();
    const e = await galat(buatPendaftarManual({ ...isi, jurusan_1: "AKL", nisn: "123" }, ctx));
    expect(e.status).toBe(422);
    expect(e.errors?.nisn).toBeDefined();
    expect(await prisma.pendaftar.count()).toBe(0);

    expect((await galat(buatPendaftarManual({ ...isi, jurusan_1: "XYZ" }, ctx))).status).toBe(422);
  });

  it("nomor tidak bentrok saat beberapa input manual berjalan bersamaan", async () => {
    const isi = await isianValid();
    const hasil = await Promise.all([1, 2, 3, 4].map(() => buatPendaftarManual({ ...isi, jurusan_1: "AKL" }, ctx)));
    expect(new Set(hasil.map((h) => h.nomor)).size).toBe(4);
  });
});
