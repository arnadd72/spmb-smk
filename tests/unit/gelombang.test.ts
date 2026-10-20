// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-gel-"));

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buatGelombang, hapusGelombang, ubahGelombang, ambilGelombangAdmin } from "@/server/actions/gelombang";
import { prisma } from "@/server/db/client";
import { ambilKonfigWizard, buatDraf, pastikanPendaftaranBuka } from "@/server/services/draf";
import { hariIniWib, statusGelombang } from "@/server/services/gelombang";
import { kirimPendaftaran } from "@/server/services/pendaftaran";
import { simpanPengaturan } from "@/server/services/pengaturan";
import { GalatApi } from "@/server/types/galat";
import { seedFormField, seedReferensi } from "../../prisma/seed-lib";
import { isiLengkap } from "../fixture-wizard";

const ctx = { userId: "1", ip: "127.0.0.1" };

const geser = (hari: number) => new Date(Date.now() + 7 * 3600_000 + hari * 86400_000).toISOString().slice(0, 10);

async function bersih() {
  await prisma.pendaftar.deleteMany();
  await prisma.pendaftaranDraft.deleteMany();
  await prisma.gelombang.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.pengaturan.deleteMany();
  await prisma.user.deleteMany();
}

async function daftarSatu() {
  const { token } = await buatDraf();
  await isiLengkap(token);
  return kirimPendaftaran(token, true);
}

const galat = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as GalatApi;
  }
  throw new Error("Seharusnya melempar galat.");
};

beforeAll(async () => {
  await seedReferensi(prisma);
  await seedFormField(prisma);
});
beforeEach(async () => {
  await bersih();
  await prisma.user.create({ data: { id: BigInt(1), name: "Panitia Uji", username: "panitia-uji", passwordHash: "x", peran: "panitia" } });
  await simpanPengaturan("tahun_ajaran", "2027/2028");
});
afterAll(async () => {
  await bersih();
  await prisma.$disconnect();
});

describe("status gelombang", () => {
  it("belum, buka, tutup, dan penuh mengikuti tanggal dan kuota", () => {
    const g = { buka: "2027-01-10", tutup: "2027-01-20", kuota: 5 };
    expect(statusGelombang(g, 0, "2027-01-09")).toBe("belum");
    expect(statusGelombang(g, 0, "2027-01-10")).toBe("buka");
    expect(statusGelombang(g, 4, "2027-01-20")).toBe("buka");
    expect(statusGelombang(g, 5, "2027-01-15")).toBe("penuh");
    expect(statusGelombang(g, 5, "2027-01-21")).toBe("tutup");
    expect(statusGelombang({ ...g, kuota: null }, 999, "2027-01-15")).toBe("buka");
  });
});

describe("pendaftaran dengan gelombang", () => {
  it("tanpa gelombang, aturan lama berlaku dan pendaftar tidak punya gelombang", async () => {
    const h = await daftarSatu();
    expect(h.nomor).toBe("SPMB-2027-0001");
    expect((await prisma.pendaftar.findFirstOrThrow()).gelombangId).toBeNull();
  });

  it("pendaftar dicatat ke gelombang berjalan dan wizard tertutup saat kuota penuh", async () => {
    await buatGelombang({ nama: "Gelombang 1", buka: geser(-1), tutup: geser(5), kuota: 2 }, ctx);
    await buatGelombang({ nama: "Gelombang 2", buka: geser(10), tutup: geser(20), kuota: 100 }, ctx);
    await daftarSatu();
    await daftarSatu();

    const g1 = await prisma.gelombang.findFirstOrThrow({ where: { nama: "Gelombang 1" } });
    expect(await prisma.pendaftar.count({ where: { gelombangId: g1.id } })).toBe(2);

    const konfig = await ambilKonfigWizard();
    expect(konfig.status).toBe("tutup");
    expect(konfig.keadaan.alasanTutup).toBe("penuh");
    const e = await galat(pastikanPendaftaranBuka());
    expect(e.code).toBe("PENDAFTARAN_PENUH");
    expect(e.message).toContain("Gelombang 1");
    expect(e.message).toContain("Gelombang 2");
  });

  it("draf yang sudah terisi tetap ditolak saat kirim bila kuota gelombang keburu penuh", async () => {
    await buatGelombang({ nama: "Gelombang 1", buka: geser(-1), tutup: geser(5), kuota: 1 }, ctx);
    const { token } = await buatDraf();
    await isiLengkap(token);
    await daftarSatu(); // mengisi kuota terakhir
    const e = await galat(kirimPendaftaran(token, true));
    expect(e.code).toBe("PENDAFTARAN_PENUH");
    expect(await prisma.pendaftar.count()).toBe(1);
  });

  it("pendaftar yang ditolak tidak menghabiskan kuota", async () => {
    await buatGelombang({ nama: "Gelombang 1", buka: geser(-1), tutup: geser(5), kuota: 1 }, ctx);
    await daftarSatu();
    expect((await ambilKonfigWizard()).status).toBe("tutup");
    await prisma.pendaftar.updateMany({ data: { statusVerifikasi: "rejected" } });
    expect((await ambilKonfigWizard()).status).toBe("buka");
    await daftarSatu();
    expect(await prisma.pendaftar.count()).toBe(2);
  });

  it("gelombang belum dibuka dan gelombang yang sudah lewat menutup wizard dengan pesan berbeda", async () => {
    await buatGelombang({ nama: "Gelombang 1", buka: geser(3), tutup: geser(9), kuota: 10 }, ctx);
    expect((await galat(pastikanPendaftaranBuka())).code).toBe("PENDAFTARAN_BELUM_BUKA");

    await prisma.gelombang.deleteMany();
    await buatGelombang({ nama: "Gelombang 1", buka: geser(-9), tutup: geser(-3), kuota: 10 }, ctx);
    const konfig = await ambilKonfigWizard();
    expect(konfig.status).toBe("tutup");
    expect(konfig.keadaan.alasanTutup).toBe("selesai");
    expect((await galat(pastikanPendaftaranBuka())).code).toBe("PENDAFTARAN_TUTUP");
  });

  it("gelombang nonaktif tidak membuka pendaftaran dan tidak tampil", async () => {
    await buatGelombang({ nama: "Gelombang 1", buka: geser(-1), tutup: geser(5), kuota: 10, isActive: false }, ctx);
    const konfig = await ambilKonfigWizard();
    // Tanpa gelombang aktif, aturan lama (selalu buka) berlaku.
    expect(konfig.keadaan.adaGelombang).toBe(false);
    expect(konfig.status).toBe("buka");
  });
});

describe("pengelolaan gelombang oleh panitia", () => {
  it("tanggal gelombang aktif tidak boleh tumpang tindih, kecuali yang nonaktif", async () => {
    await buatGelombang({ nama: "Gelombang 1", buka: geser(0), tutup: geser(10), kuota: 50 }, ctx);
    const e = await galat(buatGelombang({ nama: "Gelombang 2", buka: geser(5), tutup: geser(15), kuota: 50 }, ctx));
    expect(e.status).toBe(422);
    await buatGelombang({ nama: "Cadangan", buka: geser(5), tutup: geser(15), kuota: 50, isActive: false }, ctx);
    await buatGelombang({ nama: "Gelombang 2", buka: geser(11), tutup: geser(20), kuota: "" }, ctx);
    const { baris } = await ambilGelombangAdmin();
    expect(baris.map((b) => b.nama)).toEqual(["Gelombang 1", "Cadangan", "Gelombang 2"]);
    expect(baris.find((b) => b.nama === "Gelombang 2")?.kuota).toBeNull();
  });

  it("menolak tanggal tutup sebelum buka dan kuota tak sah", async () => {
    await expect(buatGelombang({ nama: "X", buka: geser(5), tutup: geser(1), kuota: 10 }, ctx)).rejects.toThrow();
    await expect(buatGelombang({ nama: "X", buka: geser(1), tutup: geser(5), kuota: 0 }, ctx)).rejects.toThrow();
    await expect(buatGelombang({ nama: "", buka: geser(1), tutup: geser(5) }, ctx)).rejects.toThrow();
  });

  it("ubah dicatat di audit, hapus ditolak bila sudah ada pendaftar", async () => {
    const { id } = await buatGelombang({ nama: "Gelombang 1", buka: hariIniWib(), tutup: geser(5), kuota: 10 }, ctx);
    await ubahGelombang(id, { nama: "Gelombang Satu", buka: hariIniWib(), tutup: geser(6), kuota: 12, isActive: true }, ctx);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { aksi: "gelombang.ubah" } });
    expect((audit.dataLama as { nama: string }).nama).toBe("Gelombang 1");

    await daftarSatu();
    const e = await galat(hapusGelombang(id, ctx));
    expect(e.code).toBe("GELOMBANG_TERPAKAI");

    await prisma.pendaftar.deleteMany();
    await hapusGelombang(id, ctx);
    expect(await prisma.gelombang.count()).toBe(0);
  });
});
