// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { Readable } from "node:stream";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-verif-"));

// Drive tiruan di memori: tidak ada jaringan, status terhubung dan kegagalan bisa diatur per test.
const drive = vi.hoisted(() => ({
  terhubung: true,
  gagal: false,
  isi: new Map<string, Buffer>(),
  n: 0,
}));
vi.mock("@/server/services/penyimpanan/driveOAuth", async (asli) => ({
  ...(await asli<typeof import("@/server/services/penyimpanan/driveOAuth")>()),
  statusDrive: async () => ({ terhubung: drive.terhubung, email: null, adaKredensial: true }),
}));
vi.mock("@/server/services/penyimpanan", async (asli) => ({
  ...(await asli<typeof import("@/server/services/penyimpanan")>()),
  penyimpananDokumen: async () => {
    if (!drive.terhubung) throw new Error("Google Drive belum terhubung.");
    return {
      simpan: async (_p: string, isi: Buffer) => {
        if (drive.gagal) throw new Error("Drive menolak unggahan");
        const id = `drive-${++drive.n}`;
        drive.isi.set(id, isi);
        return id;
      },
      ambilStream: async (id: string) => Readable.from(drive.isi.get(id) ?? Buffer.alloc(0)),
      hapus: async (id: string) => void drive.isi.delete(id),
      ada: async (id: string) => drive.isi.has(id),
    };
  },
}));

import {
  ambilBerkasPendaftar,
  hapusBerkasPendaftar,
  unggahBerkasPendaftar,
  bukaBerkas,
  sinkronBerkasPendaftar,
  sinkronSemuaTertunda,
} from "@/server/actions/berkas";
import { ambilPeserta } from "@/server/actions/peserta";
import {
  antreanVerifikasi,
  pendaftarBerikutnya,
  periksaNilai,
  putuskanVerifikasi,
} from "@/server/actions/verifikasi";
import { prisma } from "@/server/db/client";
import { buatDraf } from "@/server/services/draf";
import { kirimPendaftaran } from "@/server/services/pendaftaran";
import { simpanPengaturan } from "@/server/services/pengaturan";
import type { GalatApi } from "@/server/types/galat";
import { seedFormField, seedReferensi } from "../../prisma/seed-lib";
import { buatPendaftarUji } from "../fixture-pendaftar";
import { isiLengkap, PNG } from "../fixture-wizard";

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
  drive.terhubung = true;
  drive.gagal = false;
  drive.isi.clear();
  await prisma.user.create({
    data: {
      id: BigInt(1),
      name: "Panitia Uji",
      username: "panitia-uji",
      passwordHash: "x",
      peran: "panitia",
    },
  });
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

/** Pendaftar dari wizard saat Drive belum terhubung: berkas tetap di penyimpanan sementara (status menunggu). */
async function pendaftarWizard() {
  const awal = drive.terhubung;
  drive.terhubung = false;
  const { token } = await buatDraf();
  await isiLengkap(token);
  await kirimPendaftaran(token, true);
  drive.terhubung = awal;
  return prisma.pendaftar.findFirstOrThrow({ orderBy: { id: "desc" } });
}

async function baca(aliran: Readable): Promise<Buffer> {
  const bagian: Buffer[] = [];
  for await (const b of aliran) bagian.push(Buffer.from(b));
  return Buffer.concat(bagian);
}

describe("keputusan verifikasi", () => {
  it("setujui, revisi, dan tolak mengubah status, mencatat verifikator dan audit lama/baru", async () => {
    const p = await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    const id = p.id.toString();

    await putuskanVerifikasi(id, { aksi: "revisi", catatan: "Foto rapor kurang jelas" }, ctx);
    let b = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect([
      b.statusVerifikasi,
      b.catatanVerifikasi,
      b.catatanPenolakan,
      b.diverifikasiOlehId,
    ]).toEqual(["revision", "Foto rapor kurang jelas", null, BigInt(1)]);
    expect(b.diverifikasiAt).toBeInstanceOf(Date);

    await putuskanVerifikasi(id, { aksi: "tolak", catatan: "Di luar zonasi" }, ctx);
    b = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect([b.statusVerifikasi, b.catatanVerifikasi, b.catatanPenolakan]).toEqual([
      "rejected",
      null,
      "Di luar zonasi",
    ]);

    await putuskanVerifikasi(id, { aksi: "setujui" }, ctx);
    b = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect([b.statusVerifikasi, b.catatanVerifikasi, b.catatanPenolakan]).toEqual([
      "approved",
      null,
      null,
    ]);

    const audit = await prisma.auditLog.findMany({
      where: { entitasId: id },
      orderBy: { id: "asc" },
    });
    expect(audit.map((a) => a.aksi)).toEqual([
      "pendaftar.revisi",
      "pendaftar.tolak",
      "pendaftar.setujui",
    ]);
    expect((audit[0].dataLama as { status: string }).status).toBe("pending");
    expect((audit[0].dataBaru as { status: string }).status).toBe("revision");
  });

  it("revisi dan tolak wajib punya catatan; aksi asing dan pendaftar tidak ada ditolak", async () => {
    const p = await buatPendaftarUji();
    await expect(putuskanVerifikasi(p.id.toString(), { aksi: "revisi" }, ctx)).rejects.toThrow();
    await expect(
      putuskanVerifikasi(p.id.toString(), { aksi: "tolak", catatan: "x" }, ctx),
    ).rejects.toThrow(/minimal 5/);
    await expect(putuskanVerifikasi(p.id.toString(), { aksi: "hapus" }, ctx)).rejects.toThrow();
    expect((await galat(putuskanVerifikasi("987654", { aksi: "setujui" }, ctx))).status).toBe(404);
    expect(
      (await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).statusVerifikasi,
    ).toBe("pending");
  });

  it("antrean: yang menunggu saja, paling lama dulu; berikutnya melewati yang sedang dibuka", async () => {
    const lama = await buatPendaftarUji({
      nomor: "SPMB-2027-0001",
      createdAt: new Date("2027-01-01T00:00:00Z"),
    });
    const baru = await buatPendaftarUji({
      nomor: "SPMB-2027-0002",
      createdAt: new Date("2027-01-03T00:00:00Z"),
    });
    await buatPendaftarUji({
      nomor: "SPMB-2027-0003",
      status: "approved",
      createdAt: new Date("2026-12-01T00:00:00Z"),
    });

    const a = await antreanVerifikasi();
    expect(a.total).toBe(2);
    expect(a.daftar.map((x) => x.nomor)).toEqual(["SPMB-2027-0001", "SPMB-2027-0002"]);
    expect(await pendaftarBerikutnya()).toBe(lama.id.toString());
    expect(await pendaftarBerikutnya(lama.id.toString())).toBe(baru.id.toString());
    await putuskanVerifikasi(baru.id.toString(), { aksi: "setujui" }, ctx);
    expect(await pendaftarBerikutnya(lama.id.toString())).toBeNull();
  });
});

describe("pemeriksaan dan koreksi nilai", () => {
  it("'Nilai sesuai' hanya mengubah status nilai dan dicatat", async () => {
    const p = await pendaftarWizard();
    await periksaNilai(p.id.toString(), { aksi: "sesuai" }, ctx);
    expect((await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).statusNilai).toBe(
      "sesuai",
    );
    expect(await prisma.auditLog.count({ where: { aksi: "pendaftar.nilai_sesuai" } })).toBe(1);
  });

  it("koreksi menghitung ulang saran jurusan, menyimpan nilai asli sekali, dan mencatat sel yang berubah", async () => {
    const p = await pendaftarWizard();
    const awal = (await ambilPeserta(p.id.toString())).nilaiRapor as {
      semester: number[];
      mapel: Record<string, Record<string, number>>;
    };
    expect(awal.mapel.ipa["1"]).toBe(80);

    // IPA dan Matematika tinggi: saran bergeser ke FKK atau TKR
    const tinggi = structuredClone(awal.mapel);
    for (const k of ["ipa", "matematika"])
      for (const s of awal.semester)
        if (tinggi[k][String(s)] !== undefined) tinggi[k][String(s)] = 98;
    const h1 = await periksaNilai(p.id.toString(), { aksi: "koreksi", mapel: tinggi }, ctx);
    expect(["FKK", "TKR"]).toContain(
      h1.statusNilai === "dikoreksi" ? (h1 as { saran: string | null }).saran : "",
    );

    let b = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect(b.statusNilai).toBe("dikoreksi");
    expect(b.nilaiRaporSumber).toBe("manual");
    expect((b.nilaiRapor as { mapel: Record<string, Record<string, number>> }).mapel.ipa["1"]).toBe(
      98,
    );
    const asli1 = (
      b.nilaiRaporKoreksi as { asli: { mapel: Record<string, Record<string, number>> } }
    ).asli;
    expect(asli1.mapel.ipa["1"]).toBe(80);

    // koreksi kedua: nilai asli tidak tertimpa
    tinggi.ipa["1"] = 50;
    await periksaNilai(p.id.toString(), { aksi: "koreksi", mapel: tinggi }, ctx);
    b = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect(
      (b.nilaiRaporKoreksi as { asli: { mapel: Record<string, Record<string, number>> } }).asli
        .mapel.ipa["1"],
    ).toBe(80);

    const audit = await prisma.auditLog.findMany({
      where: { aksi: "pendaftar.nilai_koreksi" },
      orderBy: { id: "asc" },
    });
    const sel = (audit[0].dataBaru as { sel: Record<string, { lama: number; baru: number }> }).sel;
    expect(sel["ipa.s1"]).toEqual({ lama: 80, baru: 98 });
  });

  it("nilai di luar 0-100 atau mapel berbobot dikosongkan ditolak tanpa mengubah data", async () => {
    const p = await pendaftarWizard();
    const awal = (await ambilPeserta(p.id.toString())).nilaiRapor as {
      mapel: Record<string, Record<string, number>>;
    };

    const lebih = structuredClone(awal.mapel);
    lebih.ipa["1"] = 150;
    expect(
      (await galat(periksaNilai(p.id.toString(), { aksi: "koreksi", mapel: lebih }, ctx))).status,
    ).toBe(422);

    const kosong = structuredClone(awal.mapel);
    kosong.matematika = {};
    expect(
      (await galat(periksaNilai(p.id.toString(), { aksi: "koreksi", mapel: kosong }, ctx))).status,
    ).toBe(422);

    const b = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect(b.statusNilai).toBe("belumDicek");
    expect((b.nilaiRapor as { mapel: Record<string, Record<string, number>> }).mapel.ipa["1"]).toBe(
      80,
    );
  });
});

describe("penampil berkas dan sinkron Drive", () => {
  it("berkas yang belum di Drive dibaca dari penyimpanan sementara dan pembukaannya diaudit", async () => {
    const p = await pendaftarWizard();
    const daftar = await ambilBerkasPendaftar(p.id.toString());
    expect(daftar.map((d) => [d.kunci, d.sumber])).toEqual([
      ["akta", "sementara"],
      ["rapor", "sementara"],
    ]);

    const { aliran, mime, nama } = await bukaBerkas(p.id.toString(), "akta", 0, ctx);
    expect(mime).toBe("image/png");
    expect(nama).toBe("scan.png");
    expect((await baca(aliran)).equals(PNG)).toBe(true);
    expect(await prisma.auditLog.count({ where: { aksi: "pendaftar.berkas_lihat" } })).toBe(1);

    expect((await galat(bukaBerkas(p.id.toString(), "kk", 0, ctx))).status).toBe(404);
    expect((await galat(bukaBerkas(p.id.toString(), "../../x", 0, ctx))).status).toBe(404);
    expect((await galat(bukaBerkas("123456", "akta", 0, ctx))).status).toBe(404);
  });

  it("sinkron ulang memindahkan berkas ke Drive, menghapus berkas sementara, lalu penampil membaca dari Drive", async () => {
    const p = await pendaftarWizard();
    const id = p.id.toString();
    expect((await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).berkasSinkron).toBe(
      "menunggu",
    );

    // Drive belum terhubung: status tetap menunggu, ada pesan jelas
    drive.terhubung = false;
    const belum = await sinkronBerkasPendaftar(id, ctx);
    expect(belum.status).toBe("menunggu");
    expect(belum.pesan).toMatch(/belum terhubung/);

    drive.terhubung = true;
    expect((await sinkronBerkasPendaftar(id, ctx)).status).toBe("selesai");
    const b = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect(b.berkasSinkron).toBe("selesai");
    expect(b.aktaFileId).toMatch(/^drive-/);
    expect((b.raporFileIds as string[])[0]).toMatch(/^drive-/);

    const daftar = await ambilBerkasPendaftar(id);
    expect(daftar.every((d) => d.sumber === "drive")).toBe(true);
    const { aliran } = await bukaBerkas(id, "akta", 0, ctx);
    expect((await baca(aliran)).equals(PNG)).toBe(true);

    // sudah selesai: tidak diulang
    expect((await sinkronBerkasPendaftar(id, ctx)).status).toBe("selesai");
  });

  it("kegagalan Drive menandai gagal tanpa menghapus berkas sementara; bisa dicoba lagi", async () => {
    const p = await pendaftarWizard();
    const id = p.id.toString();
    drive.gagal = true;
    const h = await sinkronBerkasPendaftar(id, ctx);
    expect(h.status).toBe("gagal");
    expect(h.pesan).toMatch(/Drive menolak/);
    expect((await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).berkasSinkron).toBe(
      "gagal",
    );
    expect((await ambilBerkasPendaftar(id)).every((d) => d.sumber === "sementara")).toBe(true);

    drive.gagal = false;
    const massal = await sinkronSemuaTertunda(ctx);
    expect(massal).toMatchObject({ diproses: 1, selesai: 1, gagal: 0 });
  });
});

describe("kelola berkas oleh panitia", () => {
  const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 3)]);

  it("mengganti akta: berkas lama hilang, yang baru terbaca; isi palsu dan kunci asing ditolak", async () => {
    const p = await pendaftarWizard();
    const id = p.id.toString();
    const lama = (p.berkasMeta as { akta: { ref: string } }).akta.ref;
    drive.terhubung = false; // berkas baru tetap di penyimpanan sementara

    const daftar = await unggahBerkasPendaftar(id, "akta", JPG, "akta baru.jpg", ctx);
    expect(daftar.find((d) => d.kunci === "akta")).toMatchObject({ nama: "akta baru.jpg", mime: "image/jpeg", sumber: "sementara" });
    const { aliran, mime } = await bukaBerkas(id, "akta", 0, ctx);
    expect(mime).toBe("image/jpeg");
    expect((await baca(aliran)).equals(JPG)).toBe(true);
    expect(await penyimpananTempAda(lama)).toBe(false);

    expect((await galat(unggahBerkasPendaftar(id, "akta", Buffer.from("<html>bukan gambar".padEnd(40, " ")), "a.jpg", ctx))).status).toBe(422);
    expect((await galat(unggahBerkasPendaftar(id, "ijazah", JPG, "a.jpg", ctx))).status).toBe(422);
    expect((await galat(unggahBerkasPendaftar(id, "akta", Buffer.concat([JPG, Buffer.alloc(5 * 1024 * 1024)]), "a.jpg", ctx))).status).toBe(422);
    expect(await prisma.auditLog.count({ where: { aksi: "pendaftar.berkas_unggah" } })).toBe(1);
  });

  it("menambah halaman rapor sampai batas 10, lalu menghapus satu", async () => {
    const p = await pendaftarWizard();
    const id = p.id.toString();
    for (let i = 0; i < 9; i++) await unggahBerkasPendaftar(id, "rapor", JPG, `r${i}.jpg`, ctx);
    expect((await ambilBerkasPendaftar(id)).filter((d) => d.kunci === "rapor")).toHaveLength(10);
    expect((await galat(unggahBerkasPendaftar(id, "rapor", JPG, "kelebihan.jpg", ctx))).status).toBe(422);

    const sisa = await hapusBerkasPendaftar(id, "rapor", 0, ctx);
    expect(sisa.filter((d) => d.kunci === "rapor")).toHaveLength(9);
    expect((await galat(hapusBerkasPendaftar(id, "kk", 0, ctx))).status).toBe(404);
  });

  it("mengganti berkas yang sudah di Drive menghapus berkas lama di Drive dan menyinkronkan yang baru", async () => {
    const p = await pendaftarWizard();
    const id = p.id.toString();
    drive.terhubung = true;
    await sinkronBerkasPendaftar(id, ctx);
    const idLama = (await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).aktaFileId as string;
    expect(drive.isi.has(idLama)).toBe(true);

    await unggahBerkasPendaftar(id, "akta", JPG, "baru.jpg", ctx);
    const b = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect(drive.isi.has(idLama)).toBe(false);
    expect(b.aktaFileId).not.toBe(idLama);
    expect(drive.isi.get(b.aktaFileId as string)?.equals(JPG)).toBe(true);
    expect(b.berkasSinkron).toBe("selesai");

    // hapus berkas yang ada di Drive juga menghapusnya dari Drive
    await hapusBerkasPendaftar(id, "akta", 0, ctx);
    expect(drive.isi.has(b.aktaFileId as string)).toBe(false);
    expect((await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).aktaFileId).toBeNull();
  });
});

async function penyimpananTempAda(ref: string) {
  const { penyimpananTemp } = await import("@/server/services/penyimpanan");
  return penyimpananTemp().ada(ref);
}
