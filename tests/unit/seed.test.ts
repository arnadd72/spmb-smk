// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ambilJurusanRingkas } from "@/server/actions/ambilReferensi";
import { prisma } from "@/server/db/client";
import { seedFaq, seedFormField, seedReferensi } from "../../prisma/seed-lib";

beforeAll(async () => {
  await seedReferensi(prisma);
  await seedFormField(prisma);
  await seedFaq(prisma);
});

afterAll(async () => {
  await prisma.bobotJurusan.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.jurusan.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.$disconnect();
});

describe("seed referensi", () => {
  it("4 jurusan dengan kuota sesuai PRD (72, 72, 72, 108)", async () => {
    const j = await ambilJurusanRingkas();
    expect(j.map((x) => [x.kode, x.kuota])).toEqual([
      ["AKL", 72],
      ["MPLB", 72],
      ["LPK3", 72],
      ["TKR", 108],
    ]);
    expect(j.find((x) => x.kode === "LPK3")?.nama).toBe("Layanan Penunjang Kefarmasian Klinis dan Komunitas");
  });

  it("mata pelajaran dan bobot tidak di-seed lagi (PRD 1.3 butir 65)", async () => {
    expect(await prisma.mataPelajaran.count()).toBe(0);
    expect(await prisma.bobotJurusan.count()).toBe(0);
  });

  it("seed idempoten: dijalankan lagi tidak menduplikasi", async () => {
    await seedReferensi(prisma);
    await seedFormField(prisma);
    await seedFaq(prisma);
    expect(await prisma.jurusan.count()).toBe(4);
    expect(await prisma.faq.count()).toBe(6);
  });

  it("seed tidak menimpa perubahan panitia", async () => {
    await prisma.jurusan.update({ where: { kode: "AKL" }, data: { kuota: 80 } });
    await seedReferensi(prisma);
    expect((await prisma.jurusan.findUnique({ where: { kode: "AKL" } }))?.kuota).toBe(80);
    await prisma.jurusan.update({ where: { kode: "AKL" }, data: { kuota: 72 } });
  });
});

describe("seed form field", () => {
  it("isian nilai rapor dihapus, termasuk dari basis data lama (PRD 1.3 butir 65)", async () => {
    await prisma.formField.create({ data: { kunci: "nilai_rapor", langkah: 3, label: "Nilai rapor", tipe: "tabel", urutan: 20, terkunci: true } });
    await seedFormField(prisma);
    expect(await prisma.formField.findUnique({ where: { kunci: "nilai_rapor" } })).toBeNull();
  });

  it("sumber informasi pendaftar wajib dipilih", async () => {
    const f = await prisma.formField.findUniqueOrThrow({ where: { kunci: "referensi_pendaftar" } });
    expect(f.wajib).toBe(true);
  });

  it("tempat dan tanggal lahir ayah dan ibu terpisah", async () => {
    const fields = await prisma.formField.findMany({ where: { kunci: { in: ["ayah_tempat_lahir", "ayah_tanggal_lahir", "ibu_tempat_lahir", "ibu_tanggal_lahir"] } } });
    expect(fields).toHaveLength(4);
    expect(fields.every((f) => f.wajib)).toBe(true);
    expect(fields.filter((f) => f.tipe === "date").map((f) => f.kunci)).toEqual(expect.arrayContaining(["ayah_tanggal_lahir", "ibu_tanggal_lahir"]));
  });

  it("langkah 1 sampai 8 punya field kecuali langkah 3 (tes minat bakat), kunci unik, urutan terisi", async () => {
    const semua = await prisma.formField.findMany();
    for (let l = 1; l <= 8; l++) expect(semua.some((f) => f.langkah === l), `langkah ${l}`).toBe(l !== 3);
    expect(new Set(semua.map((f) => f.kunci)).size).toBe(semua.length);
  });

  it("opsi penghasilan berkode 01 sampai 05", async () => {
    const f = await prisma.formField.findUniqueOrThrow({ where: { kunci: "penghasilan" } });
    expect((f.opsi as { nilai: string }[]).map((o) => o.nilai)).toEqual(["01", "02", "03", "04", "05"]);
    expect((f.opsi as { label: string }[]).map((o) => o.label)).toEqual([
      "Kurang dari Rp500.000",
      "Rp500.000–999.999",
      "Rp1.000.000–1.999.999",
      "Rp2.000.000–4.999.999",
      "Rp5.000.000 atau lebih",
    ]);
  });

  it("nomor ijazah tidak dipakai; email dan no_wa opsional, NIK wajib", async () => {
    const f = await prisma.formField.findMany({ where: { kunci: { in: ["email", "no_wa", "nik"] } } });
    const wajib = Object.fromEntries(f.map((x) => [x.kunci, x.wajib]));
    expect(wajib).toEqual({ email: false, no_wa: false, nik: true });
    expect(await prisma.formField.findMany({ where: { kunci: { in: ["no_ijazah", "ijazah_nomor_tahun"] } } })).toHaveLength(0);
  });

  it("NIK ayah dan ibu wajib dengan petunjuk 16 digit", async () => {
    const fields = await prisma.formField.findMany({ where: { kunci: { in: ["nik_ayah", "nik_ibu"] } }, orderBy: { kunci: "asc" } });
    expect(fields.map((f) => [f.kunci, f.wajib, f.teksBantuan])).toEqual([
      ["nik_ayah", true, "16 digit angka sesuai KTP. Contoh: 3302012003800001."],
      ["nik_ibu", true, "16 digit angka sesuai KTP. Contoh: 3302011208820001."],
    ]);
  });

  it("revisi sekolah: tanpa jurusan 2 dan nilai ujian, tinggi dan berat tanpa satuan, ada contoh penulisan", async () => {
    const semua = await prisma.formField.findMany();
    const kunci = semua.map((f) => f.kunci);
    expect(kunci).not.toContain("jurusan_2");
    expect(kunci).not.toContain("nilai_ujian");
    const label = Object.fromEntries(semua.map((f) => [f.kunci, f.label]));
    expect(label.jurusan_1).toBe("Pilihan jurusan");
    expect(label.tinggi_badan).toBe("Tinggi badan");
    expect(label.berat_badan).toBe("Berat badan");
    expect(semua.find((f) => f.kunci === "tempat_lahir")?.teksBantuan).toMatch(/Contoh/);
    expect(semua.find((f) => f.kunci === "asal_sekolah")?.placeholder).toBeTruthy();
    expect(semua.find((f) => f.kunci === "asal_sekolah")?.langkah).toBe(7);
  });

  it("FKK diganti menjadi LPK3, bukan jurusan tambahan", async () => {
    const kode = (await prisma.jurusan.findMany()).map((j) => j.kode).sort();
    expect(kode).toEqual(["AKL", "LPK3", "MPLB", "TKR"]);
  });
});
