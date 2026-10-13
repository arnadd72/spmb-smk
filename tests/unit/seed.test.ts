// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ambilJurusanDenganBobot, ambilMataPelajaran } from "@/server/actions/ambilReferensi";
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
    const j = await ambilJurusanDenganBobot();
    expect(j.map((x) => [x.kode, x.kuota])).toEqual([
      ["AKL", 72],
      ["MPLB", 72],
      ["FKK", 72],
      ["TKR", 108],
    ]);
  });

  it("total bobot tiap jurusan tepat 1,00", async () => {
    for (const j of await ambilJurusanDenganBobot()) {
      expect(j.totalBobot, `bobot ${j.kode}`).toBe(1);
    }
  });

  it("bobot AKL: matematika terbesar (0,40)", async () => {
    const akl = (await ambilJurusanDenganBobot()).find((j) => j.kode === "AKL")!;
    expect(akl.bobot[0]).toMatchObject({ kode: "matematika", bobot: 0.4 });
  });

  it("17 mata pelajaran, IPA dan IPS terpadu (tidak dipecah), alias tersedia", async () => {
    const m = await ambilMataPelajaran();
    expect(m).toHaveLength(17);
    const kode = m.map((x) => x.kode);
    expect(kode).toContain("ipa");
    expect(kode).toContain("ips");
    expect(kode).not.toContain("ipa_biologi");
    expect(m.find((x) => x.kode === "ipa")?.alias).toContain("ilmu pengetahuan alam");
  });

  it("seed idempoten: dijalankan lagi tidak menduplikasi", async () => {
    await seedReferensi(prisma);
    await seedFormField(prisma);
    await seedFaq(prisma);
    expect(await prisma.jurusan.count()).toBe(4);
    expect(await prisma.bobotJurusan.count()).toBe(19);
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
  it("nilai_rapor terkunci dan wajib (tidak bisa dimatikan selama rekomendasi aktif)", async () => {
    for (const kunci of ["nilai_rapor"]) {
      const f = await prisma.formField.findUniqueOrThrow({ where: { kunci } });
      expect(f).toMatchObject({ terkunci: true, wajib: true, langkah: 3 });
    }
  });

  it("langkah 1 sampai 8 semuanya punya field, kunci unik, urutan terisi", async () => {
    const semua = await prisma.formField.findMany();
    for (let l = 1; l <= 8; l++) expect(semua.some((f) => f.langkah === l), `langkah ${l}`).toBe(true);
    expect(new Set(semua.map((f) => f.kunci)).size).toBe(semua.length);
  });

  it("opsi penghasilan berkode 01 sampai 05", async () => {
    const f = await prisma.formField.findUniqueOrThrow({ where: { kunci: "penghasilan" } });
    expect((f.opsi as { nilai: string }[]).map((o) => o.nilai)).toEqual(["01", "02", "03", "04", "05"]);
  });

  it("field opsional sesuai lampiran: email, no_wa, no_ijazah tidak wajib", async () => {
    const f = await prisma.formField.findMany({ where: { kunci: { in: ["email", "no_wa", "no_ijazah", "nik"] } } });
    const wajib = Object.fromEntries(f.map((x) => [x.kunci, x.wajib]));
    expect(wajib).toEqual({ email: false, no_wa: false, no_ijazah: false, nik: true });
  });
});
