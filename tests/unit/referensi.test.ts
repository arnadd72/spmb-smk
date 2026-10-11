// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ambilEditorBobot, buatMapel, daftarMapelAdmin, hapusMapel, simpanBobot, ubahMapel } from "@/server/actions/referensi";
import { prisma } from "@/server/db/client";
import { hitungRekomendasi, muatBobotJurusan, versiBobot } from "@/server/services/rekomendasi";
import type { GalatApi } from "@/server/types/galat";
import { hitungPeringkat } from "@/server/validasi/peringkat";
import { seedReferensi } from "../../prisma/seed-lib";
import { buatPendaftarUji } from "../fixture-pendaftar";

const ctx = { userId: "1", ip: "127.0.0.1" };

async function bersihkan() {
  await prisma.pendaftar.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.bobotJurusan.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.jurusan.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  await bersihkan();
  await prisma.user.create({ data: { id: BigInt(1), name: "Super", username: "super", passwordHash: "x", peran: "superadmin" } });
  await seedReferensi(prisma);
});
afterAll(async () => {
  await bersihkan();
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

describe("bobot jurusan", () => {
  it("rumus murni (klien) sama dengan rumus server", async () => {
    const bobot = await muatBobotJurusan();
    const nilai = { semester: [1], mapel: { matematika: { "1": 90 }, ips: { "1": 86 }, b_indonesia: { "1": 80 }, ipa: { "1": 70 } } };
    expect(hitungPeringkat(nilai, bobot)).toEqual(hitungRekomendasi(nilai, bobot).peringkat);
  });

  it("editor memuat bobot tersimpan; simpan menukar bobot, menghapus yang 0, mengubah versi, dan diaudit", async () => {
    const { jurusan } = await ambilEditorBobot();
    const akl = jurusan.find((j) => j.kode === "AKL")!;
    expect(akl.bobot.matematika).toBe(0.4);

    const versiLama = versiBobot(await muatBobotJurusan());
    const h = await simpanBobot("akl", { bobot: { matematika: "0.5", ips: 0.3, b_indonesia: 0.2, informatika: 0, b_inggris: 0 } }, ctx);
    expect(h.bobot).toEqual({ matematika: 0.5, ips: 0.3, b_indonesia: 0.2 });
    expect(h.total).toBe(1);

    const baru = (await ambilEditorBobot()).jurusan.find((j) => j.kode === "AKL")!;
    expect(baru.bobot).toEqual({ matematika: 0.5, ips: 0.3, b_indonesia: 0.2 });
    expect(versiBobot(await muatBobotJurusan())).not.toBe(versiLama);

    const audit = await prisma.auditLog.findFirstOrThrow({ where: { aksi: "bobot.ubah" } });
    expect(audit.entitasId).toBe("AKL");
    expect((audit.dataLama as Record<string, number>).informatika).toBe(0.1);
    expect((audit.dataBaru as Record<string, number>).matematika).toBe(0.5);
  });

  it("perubahan bobot tidak mengubah skor pendaftar yang sudah tersimpan", async () => {
    const p = await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    await prisma.pendaftar.update({ where: { id: p.id }, data: { rekomendasiSkor: [{ kode: "AKL", skor: 81.5 }], rekomendasiVersi: "bobot-lama" } });
    await simpanBobot("AKL", { bobot: { matematika: 1 } }, ctx);
    const sesudah = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect(sesudah.rekomendasiSkor).toEqual([{ kode: "AKL", skor: 81.5 }]);
    expect(sesudah.rekomendasiVersi).toBe("bobot-lama");
  });

  it("menolak bobot di luar 0-1, semua nol, mapel asing atau nonaktif, dan jurusan tak dikenal", async () => {
    await expect(simpanBobot("AKL", { bobot: { matematika: 1.5 } }, ctx)).rejects.toThrow();
    await expect(simpanBobot("AKL", { bobot: { matematika: -0.1 } }, ctx)).rejects.toThrow();
    await expect(simpanBobot("AKL", { bobot: { matematika: 0, ips: 0 } }, ctx)).rejects.toThrow(/minimal satu bobot/);
    expect((await galat(simpanBobot("AKL", { bobot: { fisika: 0.5 } }, ctx))).status).toBe(422);
    await prisma.mataPelajaran.update({ where: { kode: "ips" }, data: { isActive: false } });
    expect((await galat(simpanBobot("AKL", { bobot: { ips: 0.5 } }, ctx))).status).toBe(422);
    expect((await galat(simpanBobot("XYZ", { bobot: { matematika: 1 } }, ctx))).status).toBe(404);
    expect((await ambilEditorBobot()).jurusan.find((j) => j.kode === "AKL")!.bobot.matematika).toBe(0.4);
  });
});

describe("mata pelajaran", () => {
  it("tambah: alias dinormalisasi (huruf kecil, unik), urutan otomatis, kode ganda ditolak", async () => {
    const h = await buatMapel({ kode: "fisika", nama: "Fisika", alias: ["Fisika", "FISIKA", " ilmu fisika "], kelompok: "umum" }, ctx);
    expect(h.kode).toBe("fisika");
    const m = (await daftarMapelAdmin()).find((x) => x.kode === "fisika")!;
    expect(m.alias).toEqual(["fisika", "ilmu fisika"]);
    expect(m.isActive).toBe(true);
    expect(m.urutan).toBeGreaterThan(Math.max(...(await daftarMapelAdmin()).filter((x) => x.kode !== "fisika").map((x) => x.urutan)));
    expect((await galat(buatMapel({ kode: "fisika", nama: "Lagi", kelompok: "umum" }, ctx))).errors?.kode).toBeDefined();
    await expect(buatMapel({ kode: "Fisika Baru", nama: "x", kelompok: "umum" }, ctx)).rejects.toThrow();
    await expect(buatMapel({ kode: "kimia", nama: "Kimia", kelompok: "bukan" }, ctx)).rejects.toThrow();
  });

  it("ubah: kode tidak bisa diganti; nonaktif mengeluarkannya dari perhitungan saran jurusan", async () => {
    await ubahMapel("ips", { nama: "IPS Terpadu", alias: ["ips"], kelompok: "umum", isActive: false, kode: "diabaikan" }, ctx);
    const m = (await daftarMapelAdmin()).find((x) => x.kode === "ips")!;
    expect([m.nama, m.isActive]).toEqual(["IPS Terpadu", false]);
    expect(await prisma.mataPelajaran.findUnique({ where: { kode: "diabaikan" } })).toBeNull();
    const bobot = await muatBobotJurusan();
    expect(bobot.find((j) => j.kode === "AKL")!.bobot.some((b) => b.kode === "ips")).toBe(false);
    expect((await galat(ubahMapel("tidak_ada", { nama: "x", kelompok: "umum" }, ctx))).status).toBe(404);
  });

  it("hapus: ditolak (409) bila masih dipakai bobot, berhasil bila tidak", async () => {
    expect((await galat(hapusMapel("matematika", ctx))).status).toBe(409);
    await buatMapel({ kode: "kimia", nama: "Kimia", kelompok: "umum" }, ctx);
    await hapusMapel("kimia", ctx);
    expect(await prisma.mataPelajaran.findUnique({ where: { kode: "kimia" } })).toBeNull();
    expect((await galat(hapusMapel("kimia", ctx))).status).toBe(404);
    expect(await prisma.auditLog.count({ where: { aksi: { in: ["mapel.buat", "mapel.hapus"] } } })).toBe(2);
  });
});
