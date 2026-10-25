// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-ganda-"));

import { ambilDashboard } from "@/server/actions/dashboard";
import { buatPendaftarManual } from "@/server/actions/inputManual";
import { ambilPeserta, daftarPeserta, fieldEdit, ubahPeserta } from "@/server/actions/peserta";
import { prisma } from "@/server/db/client";
import { bacaData, buatDraf, muatDefinisiField, simpanLangkah } from "@/server/services/draf";
import { simpanFormEditPublik } from "@/server/services/editFormulir";
import { kemungkinanGanda, normalisasiNama, tandaiBukanDuplikat } from "@/server/services/pendaftarGanda";
import { kirimPendaftaran } from "@/server/services/pendaftaran";
import { ambilPengaturan } from "@/server/services/pengaturan";
import type { GalatApi } from "@/server/types/galat";
import { seedFormField, seedReferensi } from "../../prisma/seed-lib";
import { isiLengkap, nilaiValid } from "../fixture-wizard";

const ctx = { userId: "1", ip: "127.0.0.1" };

async function galat(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e as GalatApi;
  }
  throw new Error("Seharusnya melempar galat.");
}

async function bersih() {
  await prisma.pendaftar.deleteMany();
  await prisma.pendaftaranDraft.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.pengaturan.deleteMany();
  await prisma.user.deleteMany();
}

/** Pendaftar terkirim lewat wizard (NISN unik dari fixture). */
async function pendaftar() {
  const { token } = await buatDraf();
  await isiLengkap(token);
  const { nomor } = await kirimPendaftaran(token, true);
  return prisma.pendaftar.findUniqueOrThrow({ where: { nomorPendaftaran: nomor } });
}

const langkah1 = (x: { nama: string; nisn: string; tanggal: string }) => ({ nama_lengkap: x.nama, nisn: x.nisn, tanggal_lahir: x.tanggal, setuju: true });

beforeAll(async () => {
  await bersih();
  await seedReferensi(prisma);
  await seedFormField(prisma);
});
beforeEach(async () => {
  await bersih();
  await prisma.user.create({ data: { id: BigInt(1), name: "Panitia Uji", username: "panitia-ganda", passwordHash: "x", peran: "panitia" } });
});
afterAll(async () => {
  await bersih();
  await prisma.$disconnect();
});

describe("normalisasiNama", () => {
  it("mengabaikan huruf besar/kecil, spasi ganda, dan tanda baca", () => {
    expect(normalisasiNama("  muhammad   Afif-ramadhan. ")).toBe("MUHAMMAD AFIF RAMADHAN");
    expect(normalisasiNama("Siti Ma'rufah")).toBe(normalisasiNama("SITI MA RUFAH"));
  });
});

describe("NISN sama: pendaftaran dihentikan (poin E)", () => {
  it("langkah 1 wizard menolak NISN yang sudah terdaftar tanpa membocorkan nomor atau nama pendaftar lain", async () => {
    const lama = await pendaftar();
    const { token } = await buatDraf();
    const e = await galat(simpanLangkah(token, 1, langkah1({ nama: "Orang Lain", nisn: lama.nisn!, tanggal: "2011-01-01" })));
    expect(e.status).toBe(422);
    expect(e.errors?.nisn?.[0]).toMatch(/NISN ini sudah terdaftar/);
    expect(e.errors?.nisn?.[0]).toMatch(/Cek Pendaftaran/);
    expect(JSON.stringify(e.errors)).not.toContain(lama.nomorPendaftaran);
    expect(JSON.stringify(e.errors)).not.toContain(lama.namaLengkap);
  });

  it("kirim menolak NISN yang terdaftar setelah langkah 1 disimpan (dua pendaftaran bersamaan)", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token);
    const nisnDraf = bacaData(await prisma.pendaftaranDraft.findFirstOrThrow({ where: { submittedAt: null } }))["1"].nisn as string;
    // Pendaftar lain dengan NISN yang sama lebih dulu terkirim.
    const lain = await pendaftar();
    await prisma.pendaftar.update({ where: { id: lain.id }, data: { nisn: nisnDraf } });

    const e = await galat(kirimPendaftaran(token, true));
    expect(e.status).toBe(422);
    expect(e.errors?.nisn?.[0]).toMatch(/NISN ini sudah terdaftar/);
    expect(await prisma.pendaftar.count()).toBe(1);
  });

  it("input manual panitia menolak NISN ganda dan menyebut nomor pendaftar yang sudah ada", async () => {
    const lama = await pendaftar();
    const isi: Record<string, unknown> = {};
    for (const f of fieldEdit(await muatDefinisiField())) if (f.tipe !== "tabel") isi[f.kunci] = nilaiValid(f);
    const e = await galat(buatPendaftarManual({ ...isi, jurusan_1: "AKL", nisn: lama.nisn }, ctx));
    expect(e.status).toBe(422);
    expect(e.errors?.nisn?.[0]).toContain(lama.nomorPendaftaran);
  });

  it("mengubah NISN ke NISN pendaftar lain ditolak, baik oleh panitia maupun lewat Cek Pendaftaran; NISN sendiri tetap boleh", async () => {
    const a = await pendaftar();
    const b = await pendaftar();
    const nilaiB = (await ambilPeserta(b.id.toString())).nilai;

    expect((await galat(ubahPeserta(b.id.toString(), { ...nilaiB, nisn: a.nisn }, ctx))).errors?.nisn?.[0]).toContain(a.nomorPendaftaran);
    const publik = await galat(simpanFormEditPublik(b.id.toString(), { ...nilaiB, nisn: a.nisn }, "1.2.3.4"));
    expect(publik.errors?.nisn?.[0]).toMatch(/NISN ini sudah terdaftar/);
    expect(JSON.stringify(publik.errors)).not.toContain(a.nomorPendaftaran);

    await expect(ubahPeserta(b.id.toString(), { ...nilaiB, asal_sekolah: "SMP Lain" }, ctx)).resolves.toBeDefined();
  });
});

describe("nama dan tanggal lahir sama, NISN beda: boleh lanjut, ditandai (poin E)", () => {
  it("langkah 1 tetap tersimpan dan mengembalikan peringatan; data unik tanpa peringatan", async () => {
    const lama = await pendaftar();
    const tanggal = lama.tanggalLahir!.toISOString().slice(0, 10);

    const { token } = await buatDraf();
    const h = await simpanLangkah(token, 1, langkah1({ nama: `  ${lama.namaLengkap.toLowerCase()} `, nisn: "9988776655", tanggal }));
    expect(h.langkahTerakhir).toBe(2);
    expect(h.peringatan).toMatch(/nama dan tanggal lahir yang sama/);
    expect(h.peringatan).toMatch(/Cek Pendaftaran/);
    expect(h.peringatan).not.toContain(lama.nomorPendaftaran);

    const { token: t2 } = await buatDraf();
    expect((await simpanLangkah(t2, 1, langkah1({ nama: "Nama Yang Unik Sekali", nisn: "9988776654", tanggal }))).peringatan).toBeUndefined();
  });

  it("admin melihat pasangan ganda, bisa menandai bukan duplikat (diaudit), dan dashboard serta filter mengikutinya", async () => {
    const a = await pendaftar();
    const b = await pendaftar(); // fixture: nama dan tanggal lahir sama, NISN beda
    expect(a.nisn).not.toBe(b.nisn);

    expect((await kemungkinanGanda(a.id)).map((x) => x.nomor)).toEqual([b.nomorPendaftaran]);
    expect((await kemungkinanGanda(b.id)).map((x) => x.nomor)).toEqual([a.nomorPendaftaran]);

    const periode = (await ambilPengaturan("tahun_ajaran")) ?? a.periode;
    const filter = await daftarPeserta({ ganda: true, periode: "semua" }, periode);
    expect(filter.baris.map((x) => x.nomor).sort()).toEqual([a.nomorPendaftaran, b.nomorPendaftaran].sort());
    expect((await ambilDashboard()).peringatan.some((x) => /2 pendaftar kemungkinan ganda/.test(x.teks) && x.href === "/admin/peserta?ganda=1")).toBe(true);

    await tandaiBukanDuplikat(a.id.toString(), ctx);
    await tandaiBukanDuplikat(b.id.toString(), ctx);
    expect(await kemungkinanGanda(a.id)).toEqual([]);
    expect((await daftarPeserta({ ganda: true, periode: "semua" }, periode)).total).toBe(0);
    expect((await ambilDashboard()).peringatan.some((x) => /kemungkinan ganda/.test(x.teks))).toBe(false);
    expect(await prisma.auditLog.count({ where: { aksi: "pendaftar.bukan_duplikat" } })).toBe(2);
  });
});
