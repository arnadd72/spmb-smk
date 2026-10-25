// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { Readable } from "node:stream";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-verif-"));

// Drive tiruan di memori: tidak ada jaringan, status terhubung dan kegagalan bisa diatur per test.
const drive = vi.hoisted(() => ({
  terhubung: true,
  gagal: false,
  isi: new Map<string, Buffer>(),
  path: [] as string[],
  folder: [] as string[],
  folderDihapus: [] as string[],
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
      simpan: async (p: string, isi: Buffer) => {
        if (drive.gagal) throw new Error("Drive menolak unggahan");
        drive.path.push(p);
        const id = `drive-${++drive.n}`;
        drive.isi.set(id, isi);
        return id;
      },
      ambilStream: async (id: string) => Readable.from(drive.isi.get(id) ?? Buffer.alloc(0)),
      hapus: async (id: string) => void drive.isi.delete(id),
      ada: async (id: string) => drive.isi.has(id),
      perbarui: async (id: string, isi: Buffer) => {
        if (drive.gagal) throw new Error("Drive menolak pembaruan");
        if (!drive.isi.has(id)) throw new Error("berkas tidak ada");
        drive.isi.set(id, isi);
      },
      hapusFolderInduk: async (_id: string, awalan: string) => {
        if (drive.gagal) throw new Error("Drive menolak hapus folder");
        drive.folderDihapus.push(awalan);
      },
      gantiNamaFolder: async (_id: string, nama: string) => {
        if (drive.gagal) throw new Error("Drive menolak ganti nama");
        drive.folder.push(nama);
      },
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
import { prisma } from "@/server/db/client";
import { buatDraf } from "@/server/services/draf";
import { kirimPendaftaran, selarasFolderDrive } from "@/server/services/pendaftaran";
import { simpanPengaturan } from "@/server/services/pengaturan";
import type { GalatApi } from "@/server/types/galat";
import { seedFormField, seedReferensi } from "../../prisma/seed-lib";
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
  drive.path.length = 0;
  drive.folder.length = 0;
  drive.folderDihapus.length = 0;
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

describe("tanpa verifikasi panitia (PRD 1.3 butir 62)", () => {
  it("pendaftar dari wizard langsung diterima, tanpa pemeriksa dan tanpa catatan", async () => {
    const p = await pendaftarWizard();
    expect([p.statusVerifikasi, p.diverifikasiOlehId, p.catatanVerifikasi, p.catatanPenolakan]).toEqual(["approved", null, null, null]);
  });
});

describe("penampil berkas dan sinkron Drive", () => {
  it("berkas yang belum di Drive dibaca dari penyimpanan sementara dan pembukaannya diaudit", async () => {
    const p = await pendaftarWizard();
    const daftar = await ambilBerkasPendaftar(p.id.toString());
    // Foto rapor tidak pernah diunggah (PRD butir 40): hanya akta dan KK (wajib) yang tersimpan.
    expect(daftar.map((d) => [d.kunci, d.sumber]).sort()).toEqual([
      ["akta", "sementara"],
      ["kk", "sementara"],
    ]);

    const { aliran, mime, nama } = await bukaBerkas(p.id.toString(), "akta", 0, ctx);
    expect(mime).toBe("image/png");
    expect(nama).toBe("scan.png");
    expect((await baca(aliran)).equals(PNG)).toBe(true);
    expect(await prisma.auditLog.count({ where: { aksi: "pendaftar.berkas_lihat" } })).toBe(1);

    expect((await galat(bukaBerkas(p.id.toString(), "pas_foto", 0, ctx))).status).toBe(404);
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
    expect(b.raporFileIds).toBeNull();

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

  it("pendaftar mengganti pas foto lewat Edit Formulir: hanya gambar, diaudit tanpa akun panitia (PRD 1.3 butir 66)", async () => {
    const p = await pendaftarWizard();
    const id = p.id.toString();
    drive.terhubung = false;
    const PDF = Buffer.concat([Buffer.from("%PDF-1.4"), Buffer.alloc(40, 1)]);
    expect((await galat(unggahBerkasPendaftar(id, "pas_foto", PDF, "foto.pdf", { ip: "1.2.3.4" }))).status).toBe(422);

    const daftar = await unggahBerkasPendaftar(id, "pas_foto", JPG, "pas foto.jpg", { ip: "1.2.3.4" });
    expect(daftar.find((d) => d.kunci === "pas_foto")).toMatchObject({ nama: "pas foto.jpg", mime: "image/jpeg" });
    const { mime } = await bukaBerkas(id, "pas_foto", 0);
    expect(mime).toBe("image/jpeg");
    // Melihat berkas sendiri tanpa ctx tidak dicatat sebagai "berkas dilihat" panitia.
    expect(await prisma.auditLog.count({ where: { aksi: "pendaftar.berkas_lihat" } })).toBe(0);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { aksi: "pendaftar.berkas_unggah_publik" } });
    expect([audit.userId, audit.ip]).toEqual([null, "1.2.3.4"]);
    expect((await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).berkasSinkron).toBe("menunggu");
  });

  it("rapor tidak bisa diunggah, menghapus berkas yang tidak ada ditolak", async () => {
    const p = await pendaftarWizard();
    const id = p.id.toString();
    expect((await galat(unggahBerkasPendaftar(id, "rapor", JPG, "r.jpg", ctx))).status).toBe(422);
    expect((await ambilBerkasPendaftar(id)).filter((d) => d.kunci === "rapor")).toHaveLength(0);
    expect((await galat(hapusBerkasPendaftar(id, "pas_foto", 0, ctx))).status).toBe(404);
    expect((await galat(hapusBerkasPendaftar(id, "rapor", 0, ctx))).status).toBe(404);
  });

  it("mengganti berkas yang sudah di Drive memperbarui berkas itu di tempat: ID tetap, isi baru, status selesai", async () => {
    const p = await pendaftarWizard();
    const id = p.id.toString();
    drive.terhubung = true;
    await sinkronBerkasPendaftar(id, ctx);
    const idLama = (await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).aktaFileId as string;
    expect(drive.isi.has(idLama)).toBe(true);
    const jumlahBerkas = drive.isi.size;

    await unggahBerkasPendaftar(id, "akta", JPG, "baru.jpg", ctx);
    const b = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect(b.aktaFileId).toBe(idLama);
    expect(drive.isi.size).toBe(jumlahBerkas);
    expect(drive.isi.get(idLama)?.equals(JPG)).toBe(true);
    expect(b.berkasSinkron).toBe("selesai");

    // hapus berkas yang ada di Drive juga menghapusnya dari Drive
    await hapusBerkasPendaftar(id, "akta", 0, ctx);
    expect(drive.isi.has(idLama)).toBe(false);
    expect((await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).aktaFileId).toBeNull();
  });

  it("Drive menolak pembaruan: berkas baru disimpan sementara, berkas lama dilepas, status bisa diulang", async () => {
    const p = await pendaftarWizard();
    const id = p.id.toString();
    await sinkronBerkasPendaftar(id, ctx);

    drive.gagal = true;
    await unggahBerkasPendaftar(id, "akta", JPG, "baru.jpg", ctx);
    const b = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect(b.aktaFileId).toBeNull();
    expect(["menunggu", "gagal"]).toContain(b.berkasSinkron); // sinkron langsung yang gagal menandai "gagal"; keduanya diulang cron
    expect((await ambilBerkasPendaftar(id)).find((d) => d.kunci === "akta")?.sumber).toBe("sementara");

    drive.gagal = false;
    await sinkronBerkasPendaftar(id, ctx);
    const sesudah = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    expect(sesudah.berkasSinkron).toBe("selesai");
    expect(drive.isi.get(sesudah.aktaFileId as string)?.equals(JPG)).toBe(true);
  });

  it("nama pendaftar berubah: folder Drive diganti namanya; gagal membuat status menunggu lalu sinkron mengulang", async () => {
    const p = await pendaftarWizard();
    const id = p.id.toString();
    await sinkronBerkasPendaftar(id, ctx);

    await prisma.pendaftar.update({ where: { id: p.id }, data: { namaLengkap: "Nama / Baru: Sekali" } });
    await selarasFolderDrive(p.id);
    expect(drive.folder).toEqual([`${p.nomorPendaftaran} - NAMA  BARU SEKALI`]);
    expect((await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).berkasSinkron).toBe("selesai");

    drive.folder.length = 0;
    drive.gagal = true;
    await prisma.pendaftar.update({ where: { id: p.id }, data: { namaLengkap: "Nama Lain" } });
    await selarasFolderDrive(p.id);
    expect((await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).berkasSinkron).toBe("menunggu");

    drive.gagal = false;
    await sinkronBerkasPendaftar(id, ctx);
    expect(drive.folder).toEqual([`${p.nomorPendaftaran} - NAMA LAIN`]);
    expect((await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } })).berkasSinkron).toBe("selesai");
  });
});

async function penyimpananTempAda(ref: string) {
  const { penyimpananTemp } = await import("@/server/services/penyimpanan");
  return penyimpananTemp().ada(ref);
}

describe("kompresi dan folder Drive (poin B)", () => {
  const pngBesar = () =>
    sharp({ create: { width: 3000, height: 3000, channels: 3, background: { r: 200, g: 200, b: 200 } } }).png().toBuffer();

  it("berkas pendaftar tersimpan di {periode}/pendaftar/{nomor} - {NAMA}/", async () => {
    const p = await pendaftarWizard();
    expect((await sinkronBerkasPendaftar(p.id.toString(), ctx)).status).toBe("selesai");
    expect(drive.path.length).toBeGreaterThan(0);
    for (const x of drive.path) expect(x).toMatch(/^[^/]+\/pendaftar\/SPMB-[^/]+ - [^/]+\/[a-z_]+\.\w+$/);
  });

  it("unggahan panitia dikompres: akta besar menjadi JPEG maksimal 2000 px", async () => {
    const p = await pendaftarWizard();
    const id = p.id.toString();
    drive.terhubung = false;
    const asli = await pngBesar();
    const daftar = await unggahBerkasPendaftar(id, "akta", asli, "akta.png", ctx);
    expect(daftar.find((d) => d.kunci === "akta")).toMatchObject({ mime: "image/jpeg" });
    const { aliran } = await bukaBerkas(id, "akta", 0, ctx);
    const isi = await baca(aliran);
    expect(isi.length).toBeLessThan(asli.length);
    expect((await sharp(isi).metadata()).width).toBe(2000);
  });

  it("poin C: pas foto dari Edit Formulir masuk folder pendaftar di Drive, lalu admin dan pendaftar membacanya dari Drive", async () => {
    const p = await pendaftarWizard();
    const id = p.id.toString();
    const foto = await sharp({ create: { width: 1200, height: 1600, channels: 3, background: { r: 30, g: 60, b: 90 } } }).jpeg().toBuffer();

    const daftar = await unggahBerkasPendaftar(id, "pas_foto", foto, "pas foto.jpg", { ip: "1.2.3.4" });
    expect(daftar.find((d) => d.kunci === "pas_foto")?.sumber).toBe("drive");
    expect(drive.path.some((x) => /^[^/]+\/pendaftar\/SPMB-[^/]+ - [^/]+\/pas_foto\.jpg$/.test(x))).toBe(true);

    const b = await prisma.pendaftar.findUniqueOrThrow({ where: { id: p.id } });
    const idDrive = (b.kustomFileIds as Record<string, string>).pas_foto;
    for (const c of [ctx, undefined]) {
      const { aliran, mime } = await bukaBerkas(id, "pas_foto", 0, c);
      expect(mime).toBe("image/jpeg");
      expect((await baca(aliran)).equals(drive.isi.get(idDrive)!)).toBe(true);
    }
  });
});
