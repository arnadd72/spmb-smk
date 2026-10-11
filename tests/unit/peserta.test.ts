// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-peserta-"));

import { ambilPeserta, bacaFilter, daftarPeserta, ubahPeserta } from "@/server/actions/peserta";
import { prisma } from "@/server/db/client";
import { buatDraf } from "@/server/services/draf";
import { dekripsi } from "@/server/services/kripto";
import { kirimPendaftaran } from "@/server/services/pendaftaran";
import { simpanPengaturan } from "@/server/services/pengaturan";
import type { GalatApi } from "@/server/types/galat";
import { seedFormField, seedReferensi } from "../../prisma/seed-lib";
import { isiLengkap } from "../fixture-wizard";
import { buatPendaftarUji } from "../fixture-pendaftar";

const ctx = { userId: "1", ip: "127.0.0.1" };
const AKTIF = "2027/2028";

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
  await simpanPengaturan("tahun_ajaran", AKTIF);
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

const cari = (f: Parameters<typeof daftarPeserta>[0]) => daftarPeserta(f, AKTIF);
const nomorDari = async (f: Parameters<typeof daftarPeserta>[0]) => (await cari(f)).baris.map((b) => b.nomor).sort();

describe("daftar peserta: pencarian dan filter", () => {
  beforeEach(async () => {
    const akl = await prisma.jurusan.findUniqueOrThrow({ where: { kode: "AKL" } });
    const tkr = await prisma.jurusan.findUniqueOrThrow({ where: { kode: "TKR" } });
    await buatPendaftarUji({ nomor: "SPMB-2027-0001", nama: "Ahmad Fauzi", nisn: "1111111111", nik: "3302010101010001", noHp: "081234567890", asalSekolah: "SMP Negeri 1 Wangon", jurusan1Id: akl.id, status: "pending" });
    await buatPendaftarUji({ nomor: "SPMB-2027-0002", nama: "Siti Aminah", nisn: "2222222222", asalSekolah: "MTs Ma'arif Wangon", jurusan1Id: tkr.id, status: "approved", statusNilai: "sesuai", sumber: "luring" });
    await buatPendaftarUji({ nomor: "SPMB-2027-0003", nama: "Budi Santoso", nisn: "3333333333", status: "rejected", berkasSinkron: "gagal" });
    await buatPendaftarUji({ nomor: "SPMB-2026-0001", nama: "Dewi Lama", periode: "2026/2027" });
  });

  it("bawaan hanya periode aktif; periode=semua memuat semuanya", async () => {
    expect(await nomorDari({})).toEqual(["SPMB-2027-0001", "SPMB-2027-0002", "SPMB-2027-0003"]);
    expect((await nomorDari({ periode: "semua" })).length).toBe(4);
  });

  it("cari nama (tanpa peduli huruf), NISN, nomor, dan asal sekolah", async () => {
    expect(await nomorDari({ q: "ahmad" })).toEqual(["SPMB-2027-0001"]);
    expect(await nomorDari({ q: "2222222222" })).toEqual(["SPMB-2027-0002"]);
    expect(await nomorDari({ q: "2027-0003" })).toEqual(["SPMB-2027-0003"]);
    expect(await nomorDari({ q: "ma'arif" })).toEqual(["SPMB-2027-0002"]);
  });

  it("cari NIK lengkap dan nomor HP lewat hash, termasuk format +62", async () => {
    expect(await nomorDari({ q: "3302010101010001" })).toEqual(["SPMB-2027-0001"]);
    expect(await nomorDari({ q: "081234567890" })).toEqual(["SPMB-2027-0001"]);
    expect(await nomorDari({ q: "+62 812-3456-7890" })).toEqual(["SPMB-2027-0001"]);
    expect(await nomorDari({ q: "3302010101010009" })).toEqual([]);
  });

  it("filter status, status nilai, jurusan, sumber, dan sinkron berkas", async () => {
    expect(await nomorDari({ status: "approved" })).toEqual(["SPMB-2027-0002"]);
    expect(await nomorDari({ nilai: "sesuai" })).toEqual(["SPMB-2027-0002"]);
    expect(await nomorDari({ jurusan: "AKL" })).toEqual(["SPMB-2027-0001"]);
    expect(await nomorDari({ sumber: "luring" })).toEqual(["SPMB-2027-0002"]);
    expect(await nomorDari({ sinkron: "gagal" })).toEqual(["SPMB-2027-0003"]);
  });

  it("filter rentang tanggal kirim (WIB)", async () => {
    await buatPendaftarUji({ nomor: "SPMB-2027-0099", nama: "Lampau", createdAt: new Date("2027-01-05T10:00:00+07:00") });
    expect(await nomorDari({ dari: "2027-01-05", sampai: "2027-01-05" })).toEqual(["SPMB-2027-0099"]);
    expect(await nomorDari({ dari: "2027-01-06" })).not.toContain("SPMB-2027-0099");
  });

  it("NIK dan HP tampil tersamarkan di tabel", async () => {
    const baris = (await cari({ q: "ahmad" })).baris[0];
    expect(baris.nik).toBe("3302••••••••0001");
    expect(baris.hp).toMatch(/^0812•+890$/);
    expect(JSON.stringify(baris)).not.toContain("3302010101010001");
  });

  it("urut nama menaik dan paginasi 20 per halaman", async () => {
    expect((await cari({ urut: "nama", arah: "asc" })).baris.map((b) => b.nama)).toEqual(["Ahmad Fauzi", "Budi Santoso", "Siti Aminah"]);
    for (let i = 0; i < 20; i++) await buatPendaftarUji({ nomor: `SPMB-2027-1${String(i).padStart(3, "0")}`, nama: `Massal ${i}` });
    const h1 = await cari({ halaman: 1 });
    expect([h1.baris.length, h1.total, h1.jumlahHalaman]).toEqual([20, 23, 2]);
    expect((await cari({ halaman: 2 })).baris.length).toBe(3);
  });

  it("bacaFilter membuang nilai tak dikenal", () => {
    const f = bacaFilter({ status: "ngawur", urut: "id; drop table", halaman: "-3", q: "  x  ", dari: "bukan-tanggal", sumber: ["luring", "daring"] });
    expect(f).toMatchObject({ status: undefined, urut: undefined, halaman: 1, q: "x", dari: undefined, sumber: "luring" });
  });
});

describe("detail dan ubah data pendaftar", () => {
  async function pendaftarDariWizard() {
    const { token } = await buatDraf();
    await isiLengkap(token);
    await kirimPendaftaran(token, true);
    return prisma.pendaftar.findFirstOrThrow();
  }

  it("detail mendekripsi data sensitif dan membuat tautan WhatsApp 62xx (WA kosong memakai nomor HP)", async () => {
    const p = await pendaftarDariWizard();
    const d = await ambilPeserta(p.id.toString());
    expect(d.nilai.nik).toBe("3302010101010001");
    expect(d.nilai.no_hp).toBe("081234567890");
    expect(d.waLink).toBe("https://wa.me/6281234567890"); // no_wa dari fixture sama dengan no_hp
    expect(d.jurusan1?.kode).toBe("AKL");
    expect((await galat(ambilPeserta("999999"))).status).toBe(404);
    expect((await galat(ambilPeserta("abc"))).status).toBe(404);
  });

  it("ubah nama dan NIK: tersimpan, hash pencarian ikut berubah, audit mencatat lama dan baru tanpa NIK utuh", async () => {
    const p = await pendaftarDariWizard();
    const d = await ambilPeserta(p.id.toString());
    const hasil = await ubahPeserta(p.id.toString(), { ...d.nilai, nama_lengkap: "Nama Baru", nik: "3302010101010077" }, ctx);
    expect(hasil.berubah.sort()).toEqual(["nama_lengkap", "nik"]);

    const baru = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect(baru.namaLengkap).toBe("Nama Baru");
    expect(dekripsi(baru.nik as string)).toBe("3302010101010077");
    expect(baru.nikHash).not.toBe(p.nikHash);
    expect(await nomorDari({ q: "3302010101010077" })).toEqual([p.nomorPendaftaran]);
    expect(await nomorDari({ q: "3302010101010001" })).toEqual([]);

    const audit = await prisma.auditLog.findFirstOrThrow({ where: { aksi: "pendaftar.ubah" } });
    expect(audit.entitasId).toBe(p.id.toString());
    expect((audit.dataLama as Record<string, string>).nama_lengkap).toBe("Ahmad Fauzi");
    expect((audit.dataBaru as Record<string, string>).nama_lengkap).toBe("Nama Baru");
    const mentah = JSON.stringify(audit, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    expect(mentah).not.toContain("3302010101010077");
    expect(mentah).not.toContain("3302010101010001");
  });

  it("tanpa perubahan tidak membuat audit; data tidak valid ditolak dan tidak mengubah apa pun", async () => {
    const p = await pendaftarDariWizard();
    const d = await ambilPeserta(p.id.toString());
    expect((await ubahPeserta(p.id.toString(), d.nilai, ctx)).berubah).toEqual([]);
    expect(await prisma.auditLog.count({ where: { aksi: "pendaftar.ubah" } })).toBe(0);

    const e = await galat(ubahPeserta(p.id.toString(), { ...d.nilai, nisn: "123", nama_lengkap: "Tidak Boleh Tersimpan" }, ctx));
    expect(e.status).toBe(422);
    expect(e.errors?.nisn).toBeDefined();
    expect((await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).namaLengkap).toBe("Ahmad Fauzi");
  });

  it("mengosongkan field opsional menulis null; mengganti jurusan memperbarui relasi", async () => {
    const p = await pendaftarDariWizard();
    expect(p.email).not.toBeNull();
    const d = await ambilPeserta(p.id.toString());
    await ubahPeserta(p.id.toString(), { ...d.nilai, email: "", jurusan_1: "TKR", jurusan_2: "" }, ctx);
    const baru = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id }, include: { jurusan1: true } });
    expect(baru.email).toBeNull();
    expect(baru.jurusan1?.kode).toBe("TKR");
    expect(baru.jurusan2Id).toBeNull();
  });

  it("ubah nomor HP memperbarui hash pencarian HP", async () => {
    const p = await pendaftarDariWizard();
    const d = await ambilPeserta(p.id.toString());
    await ubahPeserta(p.id.toString(), { ...d.nilai, no_hp: "085711112222" }, ctx);
    expect(await nomorDari({ q: "085711112222" })).toEqual([p.nomorPendaftaran]);
    expect(await nomorDari({ q: "081234567890" })).toEqual([]);
  });

  it("pendaftar tidak ada menghasilkan 404", async () => {
    expect((await galat(ubahPeserta("424242", {}, ctx))).status).toBe(404);
  });
});
