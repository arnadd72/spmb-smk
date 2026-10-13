// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-ocr-"));

import { prisma } from "@/server/db/client";
import { ambilDraf, buatDraf, simpanLangkah, unggahBerkas } from "@/server/services/draf";
import { MAKS_CATATAN_PER_JAM, catatHasilOcr } from "@/server/services/ocr";
import { kirimPendaftaran } from "@/server/services/pendaftaran";
import { simpanPengaturan } from "@/server/services/pengaturan";
import { muatBobotJurusan } from "@/server/services/rekomendasi";
import { GalatApi } from "@/server/types/galat";
import { bersihkanIsianOcr } from "@/server/validasi/ocr";
import { seedFormField, seedReferensi } from "../../prisma/seed-lib";
import { PNG, isiLengkap } from "../fixture-wizard";

async function bersih() {
  await prisma.ocrHasil.deleteMany();
  await prisma.pendaftar.deleteMany();
  await prisma.pendaftaranDraft.deleteMany();
  await prisma.pengaturan.deleteMany();
}

beforeAll(async () => {
  await seedReferensi(prisma);
  await seedFormField(prisma);
});
beforeEach(async () => {
  await bersih();
  await simpanPengaturan("tahun_ajaran", "2027/2028");
});
afterAll(async () => {
  await bersih();
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

describe("bersihkanIsianOcr", () => {
  it("menyimpan nilai valid dan membuang kunci tak dikenal serta nilai tak valid", () => {
    expect(
      bersihkanIsianOcr({
        nik: "3302010101010009",
        no_kk: "12345",
        rt: "003",
        rw: "tiga",
        jenis_kelamin: "L",
        alamat: "  DUSUN SIDAURIP ",
        kunci_liar: "x",
        propinsi: 123,
      }),
    ).toEqual({ nik: "3302010101010009", rt: "003", jenis_kelamin: "L", alamat: "DUSUN SIDAURIP" });
  });

  it("masukan bukan objek menghasilkan objek kosong", () => {
    expect(bersihkanIsianOcr(null)).toEqual({});
    expect(bersihkanIsianOcr("teks")).toEqual({});
  });
});

describe("saran OCR di draf (langkah 2) dan asal nilai rapor (langkah 3)", () => {
  it("langkah 2 menyimpan saran isian yang sudah disaring dan tetap bisa diambil kembali", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token);
    await simpanLangkah(token, 2, { ocr: { nik: "3302010101010009", no_kk: "bukan-angka", tempat_lahir: "CILACAP", liar: "x" } });
    const draf = await ambilDraf(token);
    expect(draf?.data["2"].ocr).toEqual({ nik: "3302010101010009", tempat_lahir: "CILACAP" });
  });

  it("langkah 2 tanpa saran tidak membuat kunci ocr", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token);
    await simpanLangkah(token, 2, {});
    expect((await ambilDraf(token))?.data["2"].ocr).toBeUndefined();
  });

  it("asal nilai rapor tersimpan ke pendaftar saat submit, dan saran OCR tidak bocor ke data kustom", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token);
    const bobot = await muatBobotJurusan();
    const mapel = [...new Set(bobot.flatMap((j) => j.bobot.map((m) => m.kode)))];
    await simpanLangkah(token, 2, { ocr: { nik: "3302010101010009" } });
    await simpanLangkah(token, 3, {
      nilai_rapor: { mapel: Object.fromEntries(mapel.map((k) => [k, { "1": 80, "2": 82 }])) },
      sumber_nilai: "ocr_dikoreksi",
    });
    await simpanLangkah(token, 8 - 1, (await ambilDraf(token))!.data["7"]);
    const { nomor } = await kirimPendaftaran(token, true);
    const p = await prisma.pendaftar.findUniqueOrThrow({ where: { nomorPendaftaran: nomor } });
    expect(p.nilaiRaporSumber).toBe("ocr_dikoreksi");
    expect(JSON.stringify(p.dataKustom ?? {})).not.toMatch(/ocr|sumber_nilai/);
  });

  it("asal nilai rapor yang tidak dikenal dianggap manual", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token);
    const bobot = await muatBobotJurusan();
    const mapel = [...new Set(bobot.flatMap((j) => j.bobot.map((m) => m.kode)))];
    await simpanLangkah(token, 3, { nilai_rapor: { mapel: Object.fromEntries(mapel.map((k) => [k, { "1": 80 }])) }, sumber_nilai: "google" });
    expect((await ambilDraf(token))?.data["3"].sumber_nilai).toBe("manual");
  });
});

describe("foto rapor tidak disimpan (PRD butir 40)", () => {
  it("unggah berkas rapor ditolak dan langkah 3 tersimpan tanpa berkas", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token);
    expect((await galat(unggahBerkas(token, "rapor", PNG, "rapor.png"))).status).toBe(422);
    const draf = await ambilDraf(token);
    expect(draf?.berkas.rapor).toBeUndefined();
    expect(draf?.data["3"].nilai_rapor).toBeDefined();
  });

  it("pendaftaran terkirim tanpa berkas rapor, nilainya tersimpan", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token);
    const { nomor } = await kirimPendaftaran(token, true);
    const p = await prisma.pendaftar.findUniqueOrThrow({ where: { nomorPendaftaran: nomor } });
    expect(p.raporFileIds).toBeNull();
    expect(JSON.stringify(p.berkasMeta)).not.toMatch(/rapor/);
    expect(p.nilaiRapor).not.toBeNull();
  });
});

describe("catatHasilOcr", () => {
  it("mencatat ringkasan tanpa nilai hasil bacaan", async () => {
    const { token } = await buatDraf();
    await catatHasilOcr(token, { jenis: "kk", sukses: true, durasiMs: 11900, keyakinan: { nik: "HIGH", alamat: "MEDIUM", rt: "NOT_FOUND" } });
    const baris = await prisma.ocrHasil.findMany();
    expect(baris).toHaveLength(1);
    expect(baris[0]).toMatchObject({ jenis: "kk", provider: "paddleocr", sukses: true, durasiMs: 11900 });
    expect(baris[0].fields).toEqual({ nik: true, alamat: true, rt: false });
    expect(JSON.stringify([baris[0].fields, baris[0].confidence])).not.toMatch(/\d{16}/);
  });

  it("mencatat sebab gagal (waktu habis)", async () => {
    const { token } = await buatDraf();
    await catatHasilOcr(token, { jenis: "rapor", sukses: false, durasiMs: 40000, galat: "waktu_habis" });
    const [b] = await prisma.ocrHasil.findMany();
    expect(b.sukses).toBe(false);
    expect(b.confidence).toMatchObject({ _galat: "waktu_habis" });
  });

  it("menolak jenis tak dikenal dan draf yang tidak ada", async () => {
    const { token } = await buatDraf();
    expect((await galat(catatHasilOcr(token, { jenis: "ktp", sukses: true, durasiMs: 1 }))).status).toBe(422);
    expect((await galat(catatHasilOcr("token-tidak-ada", { jenis: "kk", sukses: true, durasiMs: 1 }))).status).toBe(404);
    expect((await galat(catatHasilOcr(undefined, { jenis: "kk", sukses: true, durasiMs: 1 }))).status).toBe(404);
  });

  it("membatasi jumlah catatan per draf per jam", async () => {
    const { token } = await buatDraf();
    const draf = await prisma.pendaftaranDraft.findFirstOrThrow();
    await prisma.ocrHasil.createMany({
      data: Array.from({ length: MAKS_CATATAN_PER_JAM }, () => ({ draftId: draf.id, jenis: "akta", durasiMs: 1, sukses: true, fields: {}, confidence: {} })),
    });
    expect((await galat(catatHasilOcr(token, { jenis: "akta", sukses: true, durasiMs: 5 }))).status).toBe(429);
  });
});
