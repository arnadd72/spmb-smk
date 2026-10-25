// @vitest-environment node
import { existsSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ALT_HERO_BAWAAN, ALT_HERO_UMUM, FOTO_JURUSAN_BAWAAN, GALERI_BAWAAN, fotoJurusan } from "@/lib/aset-bawaan";
import { ambilDataLanding } from "@/server/actions/ambilLanding";
import { prisma } from "@/server/db/client";
import { ambilAsetPublik, daftarAset, gantiAset, kembalikanAset, muatGaleriBawaan } from "@/server/services/asetSitus";
import { hapusMediaBila, simpanMedia } from "@/server/services/media";
import type { GalatApi } from "@/server/types/galat";
import { seedReferensi } from "../../prisma/seed-lib";

const ctx = { userId: "1", ip: "127.0.0.1" };
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 9)]);
const ke = (url: string) => path.join(process.cwd(), "public", url);
const dibuat: string[] = [];

async function galat(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e as GalatApi;
  }
  throw new Error("Seharusnya melempar galat.");
}

async function bersih() {
  await prisma.galeri.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.pengaturan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.jurusan.updateMany({ data: { gambar: null } });
}

beforeAll(async () => {
  await seedReferensi(prisma);
});
beforeEach(async () => {
  await bersih();
  await prisma.user.create({ data: { id: BigInt(1), name: "Konten", username: "konten", passwordHash: "x", peran: "konten" } });
});
afterAll(async () => {
  for (const u of dibuat) await hapusMediaBila(u);
  await bersih();
  await prisma.bobotJurusan.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.jurusan.deleteMany();
  await prisma.$disconnect();
});

describe("fotoJurusan (aturan foto bawaan atau pilihan admin)", () => {
  it("tanpa pilihan admin memakai foto bawaan lengkap dengan alt dan posisi potong", () => {
    expect(fotoJurusan("LPK3", "Farmasi", null)).toEqual(FOTO_JURUSAN_BAWAAN.LPK3);
    expect(fotoJurusan("TKR", "Teknik", undefined)?.posisi).toBeTruthy();
  });

  it("foto pilihan admin tidak membawa alt dan posisi foto bawaan", () => {
    const f = fotoJurusan("AKL", "Akuntansi dan Keuangan Lembaga", "https://contoh.com/x");
    expect(f).toEqual({ src: "https://contoh.com/x", alt: "Kegiatan praktik jurusan Akuntansi dan Keuangan Lembaga" });
  });

  it("jurusan baru tanpa foto bawaan dan tanpa pilihan admin tidak punya foto", () => {
    expect(fotoJurusan("BARU", "Jurusan Baru", null)).toBeUndefined();
  });

  it("gambar yang sama dengan bawaan dianggap bawaan", () => {
    expect(fotoJurusan("AKL", "x", FOTO_JURUSAN_BAWAAN.AKL.src)).toEqual(FOTO_JURUSAN_BAWAAN.AKL);
  });
});

describe("daftar dan penggantian foto situs", () => {
  it("awalnya logo, hero, dan foto empat jurusan memakai foto bawaan", async () => {
    const d = await daftarAset();
    expect(d.map((x) => x.kunci)).toEqual(["logo", "hero", "jurusan-AKL", "jurusan-MPLB", "jurusan-LPK3", "jurusan-TKR"].sort((a, b) => d.findIndex((x) => x.kunci === a) - d.findIndex((x) => x.kunci === b)));
    expect(d.every((x) => x.diganti === false && x.url === x.bawaan && x.url !== null)).toBe(true);
    expect(d.find((x) => x.kunci === "logo")?.url).toBe("/images/sekolah/logo-sekolah.png");
  });

  it("mengganti logo dan hero memengaruhi data publik; alt hero diganti jadi teks umum", async () => {
    expect(await ambilAsetPublik()).toMatchObject({ logo: "/images/sekolah/logo-sekolah.png", hero: "/images/sekolah/gedung-siswa.webp", heroAlt: ALT_HERO_BAWAAN });

    await gantiAset("logo", { url: "https://contoh.com/logo-baru" }, ctx);
    await gantiAset("hero", { url: "https://contoh.com/hero-baru" }, ctx);

    const publik = await ambilAsetPublik();
    expect(publik).toEqual({ logo: "https://contoh.com/logo-baru", hero: "https://contoh.com/hero-baru", heroAlt: ALT_HERO_UMUM });
    expect((await ambilDataLanding()).aset).toEqual(publik);
    expect((await daftarAset()).filter((x) => x.diganti).map((x) => x.kunci)).toEqual(["logo", "hero"]);

    const audit = await prisma.auditLog.findMany({ where: { aksi: "aset.ganti" }, orderBy: { id: "asc" } });
    expect(audit.map((a) => a.entitasId)).toEqual(["logo", "hero"]);
  });

  it("mengganti foto jurusan menulis Jurusan.gambar dan terbaca di data landing", async () => {
    await gantiAset("jurusan-akl", { url: "https://contoh.com/akl" }, ctx);
    expect((await prisma.jurusan.findUnique({ where: { kode: "AKL" } }))?.gambar).toBe("https://contoh.com/akl");
    const akl = (await ambilDataLanding()).jurusan.find((j) => j.kode === "AKL");
    expect(akl?.gambar).toBe("https://contoh.com/akl");
    expect((await ambilDataLanding()).jurusan.find((j) => j.kode === "TKR")?.gambar).toBeNull();
  });

  it("mengembalikan ke bawaan menghapus pilihan dan file unggahan lama", async () => {
    const url = await simpanMedia(PNG, "logo");
    dibuat.push(url);
    expect(existsSync(ke(url))).toBe(true);

    await gantiAset("logo", { url }, ctx);
    expect((await daftarAset()).find((x) => x.kunci === "logo")).toMatchObject({ url, diganti: true });

    await kembalikanAset("logo", ctx);
    expect((await daftarAset()).find((x) => x.kunci === "logo")).toMatchObject({ url: "/images/sekolah/logo-sekolah.png", diganti: false });
    expect(existsSync(ke(url))).toBe(false);
  });

  it("mengganti dengan foto baru membuang file unggahan sebelumnya", async () => {
    const lama = await simpanMedia(PNG, "logo");
    const baru = await simpanMedia(Buffer.concat([PNG, Buffer.from([1])]), "jurusan");
    dibuat.push(lama, baru);

    await gantiAset("jurusan-TKR", { url: lama }, ctx);
    await gantiAset("jurusan-TKR", { url: baru }, ctx);
    expect(existsSync(ke(lama))).toBe(false);
    expect(existsSync(ke(baru))).toBe(true);
  });

  it("foto bawaan situs tidak pernah dihapus dari disk", async () => {
    await gantiAset("hero", { url: "/images/sekolah/gedung-siswa.webp" }, ctx);
    await kembalikanAset("hero", ctx);
    expect(existsSync(ke("/images/sekolah/gedung-siswa.webp"))).toBe(true);
  });

  it("menolak alamat berbahaya atau kosong dan kunci yang tidak dikenal", async () => {
    expect((await galat(gantiAset("logo", { url: "javascript:alert(1)" }, ctx))).status).toBe(422);
    expect((await galat(gantiAset("logo", { url: "" }, ctx))).status).toBe(422);
    expect((await galat(gantiAset("logo", {}, ctx))).status).toBe(422);
    expect((await galat(gantiAset("rahasia", { url: "/a.png" }, ctx))).status).toBe(404);
    expect((await galat(gantiAset("jurusan-ZZZ", { url: "/a.png" }, ctx))).status).toBe(404);
    expect((await galat(kembalikanAset("../etc", ctx))).status).toBe(404);
  });
});

describe("muat foto galeri bawaan", () => {
  it("menyalin lima foto bawaan ke galeri yang kosong, lalu menolak bila sudah berisi", async () => {
    expect(await muatGaleriBawaan(ctx)).toBe(5);
    const baris = await prisma.galeri.findMany({ orderBy: { urutan: "asc" } });
    expect(baris.map((b) => b.gambar)).toEqual(GALERI_BAWAAN.map((f) => f.src));
    expect(baris.map((b) => b.judul)).toEqual(GALERI_BAWAAN.map((f) => f.ket));
    expect(baris.every((b) => b.isActive)).toBe(true);

    expect((await galat(muatGaleriBawaan(ctx))).status).toBe(422);
    expect(await prisma.galeri.count()).toBe(5);
  });

  it("foto galeri bawaan yang dimuat ikut tampil di landing", async () => {
    await muatGaleriBawaan(ctx);
    const landing = await ambilDataLanding();
    expect(landing.galeri.map((g) => g.gambar)).toEqual(GALERI_BAWAAN.map((f) => f.src));
  });
});
