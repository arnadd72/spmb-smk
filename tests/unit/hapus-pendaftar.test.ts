// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-hapus-"));

// Drive tiruan di memori: status terhubung dan kegagalan bisa diatur per test.
const drive = vi.hoisted(() => ({ terhubung: true, gagal: false, folderDihapus: [] as string[] }));
vi.mock("@/server/services/penyimpanan/driveOAuth", async (asli) => ({
  ...(await asli<typeof import("@/server/services/penyimpanan/driveOAuth")>()),
  statusDrive: async () => ({ terhubung: drive.terhubung, email: null, adaKredensial: true }),
}));
vi.mock("@/server/services/penyimpanan", async (asli) => ({
  ...(await asli<typeof import("@/server/services/penyimpanan")>()),
  penyimpananDokumen: async () => {
    if (!drive.terhubung) throw new Error("Google Drive belum terhubung.");
    return {
      // Ber-ID "hilang-..." meniru berkas yang sudah tidak ada di Drive (404): driver mengembalikan false.
      hapusFolderInduk: async (id: string, awalan: string) => {
        if (drive.gagal) throw new Error("Drive menolak hapus folder");
        if (id.startsWith("hilang-")) return false;
        drive.folderDihapus.push(awalan);
        return true;
      },
    };
  },
}));

import { cariUntukHapus, hapusPendaftar, pratinjauHapus } from "@/server/actions/hapusPendaftar";
import { prisma } from "@/server/db/client";
import type { GalatApi } from "@/server/types/galat";
import { MAKS_HAPUS } from "@/server/validasi/hapusPendaftar";
import { buatPendaftarUji } from "../fixture-pendaftar";

const sesi = { sub: "1" };
const PASSWORD = "password-uji-panjang";
const AKTIF = "2027/2028";

async function bersih() {
  await prisma.ocrHasil.deleteMany();
  await prisma.pendaftar.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.percobaanLogin.deleteMany();
  await prisma.user.deleteMany();
}

async function galat(p: Promise<unknown>): Promise<GalatApi> {
  try {
    await p;
  } catch (e) {
    return e as GalatApi;
  }
  throw new Error("Seharusnya melempar galat.");
}

beforeEach(async () => {
  await bersih();
  drive.terhubung = true;
  drive.gagal = false;
  drive.folderDihapus.length = 0;
  await prisma.user.create({ data: { id: BigInt(1), name: "Super Uji", username: "super-uji", passwordHash: bcrypt.hashSync(PASSWORD, 4), peran: "superadmin" } });
});
afterAll(async () => {
  await bersih();
});

describe("pratinjau dan pencarian", () => {
  it("mode tanggal memilih hanya pendaftar di rentang WIB", async () => {
    const dalam1 = await buatPendaftarUji({ nomor: "SPMB-2027-0001", createdAt: new Date("2026-10-24T17:30:00Z") }); // 00:30 WIB tanggal 25
    const dalam2 = await buatPendaftarUji({ nomor: "SPMB-2027-0002", createdAt: new Date("2026-10-25T16:59:00Z") }); // 23:59 WIB tanggal 25
    await buatPendaftarUji({ nomor: "SPMB-2027-0003", createdAt: new Date("2026-10-24T16:30:00Z") }); // 23:30 WIB tanggal 24
    await buatPendaftarUji({ nomor: "SPMB-2027-0004", createdAt: new Date("2026-10-25T17:01:00Z") }); // 00:01 WIB tanggal 26
    const hasil = await pratinjauHapus({ mode: "tanggal", periode: AKTIF, dari: "2026-10-25", sampai: "2026-10-25" });
    expect(hasil.total).toBe(2);
    expect(hasil.ids.sort()).toEqual([dalam1.id.toString(), dalam2.id.toString()].sort());
  });

  it("mode nomor memakai 4 digit ujung dalam satu periode", async () => {
    await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    const dua = await buatPendaftarUji({ nomor: "SPMB-2027-0002" });
    const tiga = await buatPendaftarUji({ nomor: "SPMB-2027-0003" });
    await buatPendaftarUji({ nomor: "SPMB-2027-0004" });
    await buatPendaftarUji({ nomor: "SPMB-2026-0002", periode: "2026/2027" });
    const hasil = await pratinjauHapus({ mode: "nomor", periode: AKTIF, dari: 2, sampai: 3 });
    expect(hasil.ids.sort()).toEqual([dua.id.toString(), tiga.id.toString()].sort());
    expect(hasil.contoh.map((c) => c.nomor).sort()).toEqual(["SPMB-2027-0002", "SPMB-2027-0003"]);
  });

  it("rentang terbalik atau tanpa hasil ditolak 422", async () => {
    await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    expect((await galat(pratinjauHapus({ mode: "tanggal", periode: AKTIF, dari: "2026-10-26", sampai: "2026-10-25" }))).status).toBe(422);
    expect((await galat(pratinjauHapus({ mode: "nomor", periode: AKTIF, dari: 5, sampai: 2 }))).status).toBe(422);
    expect((await galat(pratinjauHapus({ mode: "nomor", periode: AKTIF, dari: 50, sampai: 60 }))).status).toBe(422);
  });

  it("lebih dari batas maksimum ditolak dan menyuruh mempersempit", async () => {
    for (let i = 0; i < MAKS_HAPUS + 1; i += 50) {
      await Promise.all(
        Array.from({ length: Math.min(50, MAKS_HAPUS + 1 - i) }, (_, k) => buatPendaftarUji({ nomor: `SPMB-2027-${String(i + k + 1).padStart(4, "0")}` })),
      );
    }
    const e = await galat(pratinjauHapus({ mode: "nomor", periode: AKTIF, dari: 1, sampai: 9999 }));
    expect(e.status).toBe(422);
    expect(JSON.stringify(e.errors)).toContain("Persempit");
  }, 90_000);

  it("pencarian mengembalikan paling banyak 50 baris yang cocok nama atau nomor", async () => {
    await buatPendaftarUji({ nomor: "SPMB-2027-0001", nama: "Ahmad Fauzi" });
    await buatPendaftarUji({ nomor: "SPMB-2027-0002", nama: "Budi Santoso" });
    const hasil = await cariUntukHapus("fauzi", AKTIF);
    expect(hasil.map((h) => h.nomor)).toEqual(["SPMB-2027-0001"]);
    expect((await cariUntukHapus("0002", AKTIF)).map((h) => h.nama)).toEqual(["Budi Santoso"]);
  });
});

describe("hapusPendaftar", () => {
  it("dengan password benar menghapus pendaftar dan catatan OCR, audit tanpa data sensitif", async () => {
    const p = await buatPendaftarUji({ nomor: "SPMB-2027-0001", nama: "Ahmad Fauzi", nik: "3301010101010001", noHp: "081234567890" });
    await prisma.ocrHasil.create({ data: { pendaftarId: p.id, jenis: "akta", fields: { nama: "AHMAD" }, confidence: {}, durasiMs: 10, sukses: true } });

    const hasil = await hapusPendaftar(sesi, { ids: [p.id.toString()], password: PASSWORD }, "1.2.3.4");
    expect(hasil).toEqual({ terhapus: 1, dilewati: 0, gagal: [], folderHilang: [] });
    expect(await prisma.pendaftar.count()).toBe(0);
    expect(await prisma.ocrHasil.count()).toBe(0);

    const audit = await prisma.auditLog.findFirstOrThrow({ where: { aksi: "pendaftar.hapus" } });
    expect(audit.userId?.toString()).toBe("1");
    expect(audit.entitasId).toBe(p.id.toString());
    expect(Object.keys(audit.dataLama as object).sort()).toEqual(["nama", "nomor", "periode", "sumber"]);
    expect(JSON.stringify(audit, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).not.toMatch(/3301010101010001|081234567890/);
  });

  it("password salah tidak menghapus apa pun dan lima kali salah mengunci", async () => {
    const p = await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    for (let i = 0; i < 5; i++) {
      const e = await galat(hapusPendaftar(sesi, { ids: [p.id.toString()], password: "salah" }));
      expect(e.status).toBe(422);
    }
    expect((await galat(hapusPendaftar(sesi, { ids: [p.id.toString()], password: PASSWORD }))).status).toBe(429);
    expect(await prisma.pendaftar.count()).toBe(1);
  });

  it("folder Drive pendaftar ikut dihapus", async () => {
    const p = await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    await prisma.pendaftar.update({ where: { id: p.id }, data: { aktaFileId: "drive-akta" } });
    const hasil = await hapusPendaftar(sesi, { ids: [p.id.toString()], password: PASSWORD });
    expect(hasil.terhapus).toBe(1);
    expect(drive.folderDihapus).toEqual(["SPMB-2027-0001 - "]);
    expect(await prisma.pendaftar.count()).toBe(0);
  });

  it("Drive gagal: pendaftar itu tetap ada, yang lain terhapus, laporan menyebut nomor", async () => {
    const a = await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    await prisma.pendaftar.update({ where: { id: a.id }, data: { aktaFileId: "drive-akta" } });
    const b = await buatPendaftarUji({ nomor: "SPMB-2027-0002" });
    drive.gagal = true;
    const hasil = await hapusPendaftar(sesi, { ids: [a.id.toString(), b.id.toString()], password: PASSWORD });
    expect(hasil.terhapus).toBe(1);
    expect(hasil.gagal).toHaveLength(1);
    expect(hasil.gagal[0].nomor).toBe("SPMB-2027-0001");
    expect(await prisma.pendaftar.findUnique({ where: { id: a.id } })).not.toBeNull();
    expect(await prisma.pendaftar.findUnique({ where: { id: b.id } })).toBeNull();
  });

  it("Drive belum terhubung: pendaftar yang punya berkas di Drive masuk daftar gagal", async () => {
    const a = await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    await prisma.pendaftar.update({ where: { id: a.id }, data: { kkFileId: "drive-kk" } });
    drive.terhubung = false;
    const hasil = await hapusPendaftar(sesi, { ids: [a.id.toString()], password: PASSWORD });
    expect(hasil.terhapus).toBe(0);
    expect(hasil.gagal[0].pesan).toMatch(/Drive/);
    expect(await prisma.pendaftar.count()).toBe(1);
  });

  it("berkas pertama sudah hilang di Drive: berkas berikutnya dicoba sampai folder terhapus", async () => {
    const p = await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    await prisma.pendaftar.update({ where: { id: p.id }, data: { aktaFileId: "hilang-akta", kkFileId: "drive-kk" } });
    const hasil = await hapusPendaftar(sesi, { ids: [p.id.toString()], password: PASSWORD });
    expect(hasil).toEqual({ terhapus: 1, dilewati: 0, gagal: [], folderHilang: [] });
    expect(drive.folderDihapus).toEqual(["SPMB-2027-0001 - "]);
  });

  it("semua berkas sudah hilang di Drive: pendaftar tetap terhapus dan nomornya dilaporkan agar folder diperiksa manual", async () => {
    const p = await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    await prisma.pendaftar.update({ where: { id: p.id }, data: { aktaFileId: "hilang-akta", kkFileId: "hilang-kk" } });
    const hasil = await hapusPendaftar(sesi, { ids: [p.id.toString()], password: PASSWORD });
    expect(hasil.terhapus).toBe(1);
    expect(hasil.folderHilang).toEqual(["SPMB-2027-0001"]);
    expect(await prisma.pendaftar.count()).toBe(0);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { aksi: "pendaftar.hapus" } });
    expect(audit.dataBaru).toEqual({ folderDrive: "tidak-ditemukan" });
  });

  it("audit yang gagal ditulis membatalkan penghapusan: pendaftar utuh dan dilaporkan gagal", async () => {
    const p = await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    const spy = vi.spyOn(prisma.auditLog, "create").mockImplementationOnce(() => {
      throw new Error("audit gagal ditulis");
    });
    const hasil = await hapusPendaftar(sesi, { ids: [p.id.toString()], password: PASSWORD });
    spy.mockRestore();
    expect(hasil.terhapus).toBe(0);
    expect(hasil.gagal).toHaveLength(1);
    expect(await prisma.pendaftar.count()).toBe(1);
  });

  it("20 percobaan salah paralel menghasilkan paling banyak 5 percobaan yang diperiksa, sisanya 429", async () => {
    const p = await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    const hasil = await Promise.allSettled(Array.from({ length: 20 }, () => hapusPendaftar(sesi, { ids: [p.id.toString()], password: "salah" })));
    const status = hasil.map((h) => (h.status === "rejected" ? (h.reason as GalatApi).status : 200));
    expect(status.filter((s) => s === 422).length).toBeLessThanOrEqual(5);
    expect(status.filter((s) => s === 429).length).toBeGreaterThanOrEqual(15);
    expect(await prisma.percobaanLogin.count({ where: { username: "hapus:1" } })).toBeLessThanOrEqual(5);
    expect(await prisma.pendaftar.count()).toBe(1);
  });

  it("ID tak sah atau lebih dari 10 ditolak 422, ID yang sudah tidak ada dilewati", async () => {
    expect((await galat(hapusPendaftar(sesi, { ids: ["abc"], password: PASSWORD }))).status).toBe(422);
    expect((await galat(hapusPendaftar(sesi, { ids: [], password: PASSWORD }))).status).toBe(422);
    expect((await galat(hapusPendaftar(sesi, { ids: Array.from({ length: 11 }, (_, i) => String(i + 1)), password: PASSWORD }))).status).toBe(422);
    expect((await galat(hapusPendaftar(sesi, { ids: ["1"] }))).status).toBe(422);
    const hasil = await hapusPendaftar(sesi, { ids: ["999999999"], password: PASSWORD });
    expect(hasil).toEqual({ terhapus: 0, dilewati: 1, gagal: [], folderHilang: [] });
  });
});
