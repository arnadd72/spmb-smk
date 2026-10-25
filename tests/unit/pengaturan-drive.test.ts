// @vitest-environment node
import { Readable } from "node:stream";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ujiPenyimpanan } from "@/server/services/penyimpanan";
import type { PenyimpananDokumen } from "@/server/services/penyimpanan/antarmuka";
import {
  KEY_REFRESH_TOKEN,
  putuskanDrive,
  statusDrive,
} from "@/server/services/penyimpanan/driveOAuth";
import { ambilPengaturan, ambilPengaturanTerenkripsi, simpanPengaturan, simpanPengaturanTerenkripsi } from "@/server/services/pengaturan";

beforeEach(async () => {
  await prisma.pengaturan.deleteMany();
});

afterAll(async () => {
  await prisma.pengaturan.deleteMany();
  await prisma.$disconnect();
});

describe("pengaturan", () => {
  it("nilai terenkripsi tidak tersimpan polos di database", async () => {
    await simpanPengaturanTerenkripsi("rahasia", "refresh-token-asli");

    expect(await ambilPengaturan("rahasia")).not.toContain("refresh-token-asli");
    expect(await ambilPengaturanTerenkripsi("rahasia")).toBe("refresh-token-asli");
  });

  it("simpan menimpa nilai lama", async () => {
    await simpanPengaturan("tahun_ajaran", "2027/2028");
    await simpanPengaturan("tahun_ajaran", "2028/2029");
    expect(await ambilPengaturan("tahun_ajaran")).toBe("2028/2029");
  });
});

describe("status dan pemutusan Google Drive", () => {
  it("terhubung bila refresh token ada, putuskan menghapusnya", async () => {
    expect((await statusDrive()).terhubung).toBe(false);

    await simpanPengaturanTerenkripsi(KEY_REFRESH_TOKEN, "token");
    expect((await statusDrive()).terhubung).toBe(true);

    await putuskanDrive();
    expect((await statusDrive()).terhubung).toBe(false);
  });
});

class PenyimpananMemori implements PenyimpananDokumen {
  berkas = new Map<string, Buffer>();
  async simpan(path: string, isi: Buffer) {
    this.berkas.set(path, isi);
    return path;
  }
  async ambilStream(ref: string) {
    const b = this.berkas.get(ref);
    if (!b) throw new Error("tidak ada");
    return Readable.from(b);
  }
  async hapus(ref: string) {
    this.berkas.delete(ref);
  }
  async ada(ref: string) {
    return this.berkas.has(ref);
  }
  async perbarui(ref: string, isi: Buffer) {
    this.berkas.set(ref, isi);
  }
  async gantiNamaFolder() {}
  async hapusFolderInduk() {
    return true;
  }
}

describe("ujiPenyimpanan", () => {
  it("lolos dan tidak meninggalkan berkas bila driver sehat", async () => {
    const p = new PenyimpananMemori();
    await expect(ujiPenyimpanan(p)).resolves.toBeUndefined();
    expect(p.berkas.size).toBe(0);
  });

  it("gagal bila berkas tidak benar-benar terhapus", async () => {
    const p = new PenyimpananMemori();
    p.hapus = async () => {};
    await expect(ujiPenyimpanan(p)).rejects.toThrow(/masih ada/);
  });

  it("gagal bila isi yang dibaca berbeda", async () => {
    const p = new PenyimpananMemori();
    p.ambilStream = async () => Readable.from(Buffer.from("isi-lain"));
    await expect(ujiPenyimpanan(p)).rejects.toThrow(/tidak sama/);
  });
});
