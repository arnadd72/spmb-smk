// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { buatKonten, daftarKonten, geserSoalMinat, hapusKonten, ubahKonten } from "@/server/actions/konten";
import { prisma } from "@/server/db/client";
import { muatSoalMinat } from "@/server/services/soalMinat";
import { MAKS_SOAL_MINAT } from "@/server/validasi/minat";

const ctx = { userId: "1", ip: "127.0.0.1" };
const soal = (teks: string, ekstra: object = {}) => ({ teks, opsi: ["Pilihan satu", "Pilihan dua", "Pilihan tiga", "Pilihan empat"], ...ekstra });

async function bersih() {
  await prisma.auditLog.deleteMany();
  await prisma.soalMinat.deleteMany();
  await prisma.user.deleteMany();
  await prisma.user.create({ data: { id: BigInt(1), name: "Uji", username: "uji", passwordHash: "x", peran: "superadmin" } });
}

beforeEach(bersih);
afterAll(async () => {
  await bersih();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

const galat = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error("Seharusnya melempar galat.");
};

describe("soal tes minat bakat (PRD 1.3 butir 80)", () => {
  it("soal baru ditaruh di urutan terakhir dan muncul di pemuat", async () => {
    await buatKonten("soalMinat", soal("Soal pertama"), ctx);
    await buatKonten("soalMinat", soal("Soal kedua"), ctx);
    const daftar = await muatSoalMinat();
    expect(daftar.map((x) => [x.teks, x.urutan])).toEqual([["Soal pertama", 1], ["Soal kedua", 2]]);
    expect(daftar[0].opsi).toHaveLength(4);
    expect(await prisma.auditLog.count({ where: { aksi: "soalMinat.buat" } })).toBe(2);
  });

  it("menolak pilihan kurang atau lebih dari 4, pilihan kosong, dan teks terlalu pendek atau panjang", async () => {
    const tolak = async (data: object) => expect(await galat(buatKonten("soalMinat", data, ctx))).toBeInstanceOf(ZodError); // rute API mengubahnya menjadi 422
    await tolak({ teks: "Soal valid", opsi: ["a1", "b2", "c3"] });
    await tolak({ teks: "Soal valid", opsi: ["a1", "b2", "c3", "d4", "e5"] });
    await tolak(soal("Soal valid", { opsi: ["a1", "b2", "c3", "   "] }));
    await tolak(soal("pdk"));
    await tolak(soal("x".repeat(301)));
    await tolak(soal("Soal valid", { opsi: ["a1", "b2", "c3", "x".repeat(301)] }));
    expect(await prisma.soalMinat.count()).toBe(0);
  });

  it("memotong spasi di tepi teks dan pilihan", async () => {
    await buatKonten("soalMinat", soal("  Soal berspasi  ", { opsi: [" satu ", "dua", "tiga", "empat"] }), ctx);
    const [s] = await muatSoalMinat();
    expect(s.teks).toBe("Soal berspasi");
    expect(s.opsi[0]).toBe("satu");
  });

  it("maksimal 50 soal", async () => {
    await prisma.soalMinat.createMany({ data: Array.from({ length: MAKS_SOAL_MINAT }, (_, i) => ({ teks: `Soal ${i}`, opsi: ["a1", "b2", "c3", "d4"], urutan: i + 1 })) });
    expect(await galat(buatKonten("soalMinat", soal("Soal ke-51"), ctx))).toMatchObject({ status: 422 });
    expect(await prisma.soalMinat.count()).toBe(MAKS_SOAL_MINAT);
  });

  it("ubah teks dan pilihan; nonaktif tidak muncul di pemuat publik tetapi muncul di pemuat admin", async () => {
    const baru = (await buatKonten("soalMinat", soal("Soal lama"), ctx)) as { id: string };
    await ubahKonten("soalMinat", baru.id, soal("Soal diubah", { isActive: false }), ctx);
    expect(await muatSoalMinat()).toEqual([]);
    const semua = await muatSoalMinat({ semua: true });
    expect(semua).toHaveLength(1);
    expect(semua[0]).toMatchObject({ teks: "Soal diubah", isActive: false });
    expect(await prisma.auditLog.count({ where: { aksi: "soalMinat.ubah" } })).toBe(1);
  });

  it("hapus soal dan id tidak ada ditolak 404", async () => {
    const baru = (await buatKonten("soalMinat", soal("Akan dihapus"), ctx)) as { id: string };
    await hapusKonten("soalMinat", baru.id, ctx);
    expect(await prisma.soalMinat.count()).toBe(0);
    expect(await galat(hapusKonten("soalMinat", baru.id, ctx))).toMatchObject({ status: 404 });
    expect(await galat(ubahKonten("soalMinat", "abc", soal("Soal valid"), ctx))).toMatchObject({ status: 404 });
  });

  it("geser naik dan turun menukar tetangga, batas atas dan bawah tidak berubah, urutan dinomori ulang", async () => {
    const a = (await buatKonten("soalMinat", soal("Soal A"), ctx)) as { id: string };
    const b = (await buatKonten("soalMinat", soal("Soal B"), ctx)) as { id: string };
    const c = (await buatKonten("soalMinat", soal("Soal C"), ctx)) as { id: string };
    const teks = async () => (await muatSoalMinat()).map((x) => x.teks);

    await geserSoalMinat(c.id, { arah: "naik" }, ctx);
    expect(await teks()).toEqual(["Soal A", "Soal C", "Soal B"]);
    await geserSoalMinat(a.id, { arah: "naik" }, ctx);
    expect(await teks()).toEqual(["Soal A", "Soal C", "Soal B"]);
    await geserSoalMinat(b.id, { arah: "turun" }, ctx);
    expect(await teks()).toEqual(["Soal A", "Soal C", "Soal B"]);
    await geserSoalMinat(a.id, { arah: "turun" }, ctx);
    expect(await teks()).toEqual(["Soal C", "Soal A", "Soal B"]);
    expect((await muatSoalMinat()).map((x) => x.urutan)).toEqual([1, 2, 3]);
    expect(await galat(geserSoalMinat(a.id, { arah: "samping" }, ctx))).toBeInstanceOf(ZodError);
    expect(await galat(geserSoalMinat("999999", { arah: "naik" }, ctx))).toMatchObject({ status: 404 });
  });

  it("posisi: soal baru dan soal yang diubah ditaruh di nomor pilihan admin, soal lain bergeser, nomor di luar rentang dipotong", async () => {
    const teks = async () => (await muatSoalMinat({ semua: true })).map((x) => x.teks);
    await buatKonten("soalMinat", soal("Soal A"), ctx);
    await buatKonten("soalMinat", soal("Soal B"), ctx);
    await buatKonten("soalMinat", soal("Soal C"), ctx);
    await buatKonten("soalMinat", soal("Soal D baru", { posisi: 1 }), ctx);
    expect(await teks()).toEqual(["Soal D baru", "Soal A", "Soal B", "Soal C"]);
    await buatKonten("soalMinat", soal("Soal E baru", { posisi: 3 }), ctx);
    expect(await teks()).toEqual(["Soal D baru", "Soal A", "Soal E baru", "Soal B", "Soal C"]);
    await buatKonten("soalMinat", soal("Soal F baru", { posisi: 50 }), ctx);
    expect((await teks()).at(-1)).toBe("Soal F baru");

    const c = (await muatSoalMinat({ semua: true })).find((x) => x.teks === "Soal C")!;
    await ubahKonten("soalMinat", c.id, soal("Soal C", { posisi: 1 }), ctx);
    expect((await teks()).slice(0, 3)).toEqual(["Soal C", "Soal D baru", "Soal A"]);
    // Tanpa posisi, ubah teks tidak memindahkan.
    await ubahKonten("soalMinat", c.id, soal("Soal C diubah"), ctx);
    expect((await teks())[0]).toBe("Soal C diubah");
    expect((await muatSoalMinat({ semua: true })).map((x) => x.urutan)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(await galat(buatKonten("soalMinat", soal("Soal G", { posisi: 0 }), ctx))).toBeInstanceOf(ZodError);
  });

  it("geser merapikan urutan kembar", async () => {
    await prisma.soalMinat.createMany({
      data: [
        { teks: "Kembar 1", opsi: ["a1", "b2", "c3", "d4"], urutan: 5 },
        { teks: "Kembar 2", opsi: ["a1", "b2", "c3", "d4"], urutan: 5 },
      ],
    });
    const [pertama] = await muatSoalMinat();
    await geserSoalMinat(pertama.id, { arah: "turun" }, ctx);
    expect((await muatSoalMinat()).map((x) => [x.teks, x.urutan])).toEqual([["Kembar 2", 1], ["Kembar 1", 2]]);
  });

  it("pemuat melewati baris yang pilihannya rusak", async () => {
    await prisma.soalMinat.create({ data: { teks: "Rusak", opsi: ["hanya satu"], urutan: 1 } });
    await prisma.soalMinat.create({ data: { teks: "Sehat", opsi: ["a1", "b2", "c3", "d4"], urutan: 2 } });
    expect((await muatSoalMinat()).map((x) => x.teks)).toEqual(["Sehat"]);
  });

  it("daftar admin bisa dicari lewat teks soal", async () => {
    await buatKonten("soalMinat", soal("Soal tentang mesin"), ctx);
    await buatKonten("soalMinat", soal("Soal tentang uang"), ctx);
    const hasil = await daftarKonten("soalMinat", { q: "mesin" });
    expect(hasil.total).toBe(1);
  });
});
