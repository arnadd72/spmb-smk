// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-draf-"));

import { prisma } from "@/server/db/client";
import { ambilDraf, bacaData, buatDraf, hapusDraf, muatDefinisiField, rekomendasiDraf, simpanLangkah, unggahBerkas } from "@/server/services/draf";
import { dekripsi, enkripsi } from "@/server/services/kripto";
import { cekStatus, kirimPendaftaran, ambilRingkasanSukses } from "@/server/services/pendaftaran";
import { formulirDariToken } from "@/server/services/pdf/formulir";
import { simpanPengaturan } from "@/server/services/pengaturan";
import { penyimpananTemp } from "@/server/services/penyimpanan";
import { hitungRekomendasi, muatJurusanAktif } from "@/server/services/rekomendasi";
import { muatSoalMinat } from "@/server/services/soalMinat";
import { BATAS_SOAL_MINAT, JURUSAN_MINAT, VERSI_MINAT } from "@/server/validasi/minat";
import { skemaLangkah } from "@/server/validasi/wizard";
import { GalatApi } from "@/server/types/galat";
import { seedFormField, seedReferensi } from "../../prisma/seed-lib";
import { PNG, isiLengkap } from "../fixture-wizard";

async function bersih() {
  await prisma.pendaftar.deleteMany();
  await prisma.pendaftaranDraft.deleteMany();
  await prisma.percobaanLogin.deleteMany();
  await prisma.pengaturan.deleteMany();
}

beforeAll(async () => {
  await seedReferensi(prisma);
  await seedFormField(prisma);
});
beforeEach(async () => {
  await bersih();
  await simpanPengaturan("tahun_ajaran", "2027/2028");
});
afterAll(async () => {
  await bersih();
  await prisma.$disconnect();
});

/** Isi langkah 1 dan 2 (Akta dan KK wajib) agar langkah 3 terbuka. */
async function sampaiLangkah3(token: string) {
  await simpanLangkah(token, 1, { nama_lengkap: "Siti Aminah", nisn: "1234567890", tanggal_lahir: "2011-02-03", setuju: true });
  await unggahBerkas(token, "akta", PNG, "akta.png");
  await unggahBerkas(token, "kk", PNG, "kk.png");
  await simpanLangkah(token, 2, {});
}

const galat = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as GalatApi;
  }
  throw new Error("Seharusnya melempar galat.");
};

describe("rekomendasi jurusan dari tes minat bakat (PRD 1.3 butir 65)", () => {
  it("membaca pilihan FKK dari draf lama sebagai LPK3", () => {
    const baris = {
      data: { v: enkripsi(JSON.stringify({ "4": { jurusan_1: "FKK", jurusan_2: "AKL" } })) },
    } as unknown as Parameters<typeof bacaData>[0];
    expect(bacaData(baris)["4"]).toEqual({ jurusan_1: "LPK3", jurusan_2: "AKL" });
  });

  it("tanpa tes minat bakat, rekomendasi kosong dan pilihan jurusan tetap manual", async () => {
    const { token } = await buatDraf();
    await sampaiLangkah3(token);
    await simpanLangkah(token, 3, { minat: [] });
    expect((await rekomendasiDraf(token)).peringkat).toEqual([]);
    await simpanLangkah(token, 4, { jurusan_1: "AKL", jurusan_2: "" });
    expect((await ambilDraf(token))?.data["4"]?.jurusan_1).toBe("AKL");
  });

  it("jawaban tes tersimpan di draf dan jurusan dengan jawaban terbanyak paling sesuai", async () => {
    const { token } = await buatDraf();
    await sampaiLangkah3(token);
    // Pilihan D (TKR) 9 kali, C (LPK3) 4 kali, sisanya dilewati: tes boleh dikerjakan sebagian.
    await simpanLangkah(token, 3, { minat: [3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2] });
    const minat = (await ambilDraf(token))?.data["3"]?.minat as (number | null)[];
    expect(minat).toHaveLength((await muatSoalMinat()).length);
    expect(minat.slice(-2)).toEqual([null, null]);
    const r = await rekomendasiDraf(token);
    expect(r.versi).toBe(VERSI_MINAT);
    expect(r.peringkat.map((p) => [p.kode, p.poin, p.label])).toEqual([
      ["TKR", 9, "Paling Sesuai"],
      ["LPK3", 4, "Juga Sesuai"],
      // Seri nol poin diurutkan sesuai urutan jurusan.
      ["AKL", 0, "Alternatif"],
      ["MPLB", 0, "Alternatif"],
    ]);
    expect(r.peringkat[0].skor).toBeCloseTo(69.2, 1);
  });

  it("nilai seri tertinggi sama-sama Paling Sesuai", async () => {
    const jurusan = await muatJurusanAktif();
    const r = hitungRekomendasi([0, 1, 0, 1], jurusan).peringkat;
    expect(r.filter((p) => p.label === "Paling Sesuai").map((p) => p.kode).sort()).toEqual(["AKL", "MPLB"]);
  });

  it("jawaban di luar A-D atau terlalu panjang ditolak", async () => {
    const { token } = await buatDraf();
    await sampaiLangkah3(token);
    expect((await galat(simpanLangkah(token, 3, { minat: [4] }))).errors?.minat).toBeDefined();
    expect((await galat(simpanLangkah(token, 3, { minat: Array(BATAS_SOAL_MINAT + 1).fill(0) }))).errors?.minat).toBeDefined();
    expect((await galat(simpanLangkah(token, 3, { minat: "AKL" }))).errors?.minat).toBeDefined();
  });

  it("soal tes dari database (PRD 1.3 butir 80): 15 soal bawaan migrasi, tiap soal 4 pilihan A-D", async () => {
    const soal = await muatSoalMinat();
    expect(soal).toHaveLength(15);
    expect(soal[0].teks).toBe("Kegiatan apa yang paling kamu sukai ketika berada di sekolah?");
    for (const s of soal) expect(s.opsi).toHaveLength(JURUSAN_MINAT.length);
  });

  it("soal yang disembunyikan admin tidak ikut; jawaban mengikuti jumlah soal aktif dan kelebihannya dibuang", async () => {
    const pertama = await prisma.soalMinat.findFirstOrThrow({ orderBy: { urutan: "asc" } });
    await prisma.soalMinat.update({ where: { id: pertama.id }, data: { isActive: false } });
    try {
      const soal = await muatSoalMinat();
      expect(soal).toHaveLength(14);
      expect(soal[0].teks).not.toBe(pertama.pertanyaan);

      // Draf yang diisi saat soal masih 15 tetap bisa disimpan; jawaban ke-15 dibuang.
      const { token } = await buatDraf();
      await sampaiLangkah3(token);
      await simpanLangkah(token, 3, { minat: Array(15).fill(3) });
      const minat = (await ambilDraf(token))?.data["3"]?.minat as (number | null)[];
      expect(minat).toEqual(Array(14).fill(3));
    } finally {
      await prisma.soalMinat.update({ where: { id: pertama.id }, data: { isActive: true } });
    }
  });
});

describe("validasi langkah", () => {
  it("menolak NISN bukan 10 digit, tanggal lahir masa depan, dan persetujuan kosong", async () => {
    const fields = await muatDefinisiField();
    const r = skemaLangkah(fields, 1).safeParse({ nama_lengkap: "Ahmad", nisn: "123", tanggal_lahir: "2999-01-01", setuju: false });
    expect(r.success).toBe(false);
    const peta = Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));
    expect(peta.nisn).toMatch(/10 digit/);
    expect(peta.tanggal_lahir).toMatch(/sebelum hari ini/);
    expect(peta.setuju).toBeTruthy();
  });

  it("langkah 4 hanya meminta satu pilihan jurusan", async () => {
    const fields = await muatDefinisiField();
    expect(fields.filter((f) => f.langkah === 4).map((f) => f.kunci)).toEqual(["jurusan_1"]);
    expect(skemaLangkah(fields, 4).safeParse({ jurusan_1: "AKL" }).success).toBe(true);
    expect(skemaLangkah(fields, 4).safeParse({}).success).toBe(false);
  });
});

describe("draf dan gerbang langkah", () => {
  it("token disimpan sebagai hash, isian terenkripsi, dan langkah tidak bisa dilompati", async () => {
    const { token } = await buatDraf("127.0.0.1", "uji");
    const baris = await prisma.pendaftaranDraft.findFirstOrThrow();
    expect(baris.tokenHash).not.toBe(token);
    expect(baris.tokenHash).toHaveLength(64);

    const e = await galat(simpanLangkah(token, 3, {}));
    expect(e.code).toBe("STEP_LOCKED");

    await simpanLangkah(token, 1, { nama_lengkap: "Siti Aminah", nisn: "1234567890", tanggal_lahir: "2011-02-03", setuju: true });
    const mentah = JSON.stringify((await prisma.pendaftaranDraft.findFirstOrThrow()).data);
    expect(mentah).not.toContain("Siti Aminah");
    const draf = await ambilDraf(token);
    expect(draf?.data["1"].nama_lengkap).toBe("Siti Aminah");
    expect(draf?.langkahTerakhir).toBe(2);
  });

  it("menolak berkas yang isinya bukan JPG/PNG/WebP/PDF walau namanya .jpg", async () => {
    const { token } = await buatDraf();
    const e = await galat(unggahBerkas(token, "akta", Buffer.from("<script>alert(1)</script>".padEnd(40, " ")), "x.jpg"));
    expect(e.status).toBe(422);
  });

  it("menolak berkas lebih dari 5 MB dan kunci berkas tak dikenal", async () => {
    const { token } = await buatDraf();
    expect((await galat(unggahBerkas(token, "akta", Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]), "b.png"))).status).toBe(422);
    expect((await galat(unggahBerkas(token, "../../etc", PNG, "b.png"))).status).toBe(422);
  });

  it("pendaftaran di luar jadwal gelombang ditolak", async () => {
    await simpanPengaturan("gelombang_tutup", "2000-01-01");
    expect((await galat(buatDraf())).code).toBe("PENDAFTARAN_TUTUP");
  });

  it("hapus draf menghapus berkasnya", async () => {
    const { token } = await buatDraf();
    await unggahBerkas(token, "akta", PNG, "a.png");
    await hapusDraf(token);
    expect(await prisma.pendaftaranDraft.count()).toBe(0);
  });
});

describe("submit pendaftaran", () => {
  it("membuat nomor berurutan, mengenkripsi data sensitif, dan idempoten saat dikirim ulang", async () => {
    const a = (await buatDraf()).token;
    await isiLengkap(a);
    const rekom = await rekomendasiDraf(a);
    expect(rekom.peringkat).toHaveLength(4);

    const hasil = await kirimPendaftaran(a, true);
    expect(hasil.nomor).toBe("SPMB-2027-0001");

    // kirim ulang (klik ganda): hasil sama, tidak ada pendaftar kedua
    const ulang = await kirimPendaftaran(a, true);
    expect(ulang).toEqual(hasil);
    expect(await prisma.pendaftar.count()).toBe(1);

    const p = await prisma.pendaftar.findFirstOrThrow();
    expect(p.nik).not.toBe("3302010101010001");
    expect(dekripsi(p.nik as string)).toBe("3302010101010001");
    expect(p.nikHash).toHaveLength(64);
    expect(dekripsi(p.noHp as string)).toBe("081234567890");
    expect(p.aksesTokenHash).not.toBe(hasil.aksesToken);
    expect(p.berkasSinkron).toBe("menunggu"); // Drive belum terhubung di test
    // Saran dihitung ulang di server dari jawaban tes; nilai rapor tidak lagi diisi (PRD 1.3 butir 65).
    expect((await prisma.jurusan.findUnique({ where: { id: p.rekomendasiJurusanId! } }))?.kode).toBe("AKL");
    expect(p.rekomendasiVersi).toBe(VERSI_MINAT);
    expect(p.nilaiRapor).toEqual({});

    const b = (await buatDraf()).token;
    await isiLengkap(b);
    expect((await kirimPendaftaran(b, true)).nomor).toBe("SPMB-2027-0002");
  });

  it("pilihan jurusan 2 boleh tidak dikirim sama sekali", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token, true);
    await kirimPendaftaran(token, true);
    const p = await prisma.pendaftar.findFirstOrThrow();
    expect(p.jurusan2Id).toBeNull();
  });

  it("nomor tidak bentrok saat dua pengiriman berjalan bersamaan", async () => {
    const tokens = await Promise.all([buatDraf(), buatDraf(), buatDraf()].map(async (p) => (await p).token));
    for (const t of tokens) await isiLengkap(t);
    const hasil = await Promise.all(tokens.map((t) => kirimPendaftaran(t, true)));
    expect(new Set(hasil.map((h) => h.nomor)).size).toBe(3);
  });

  describe("kuota jurusan ditegakkan karena pendaftar langsung diterima (PRD 1.3 butir 62)", () => {
    const aturKuota = (kuota: number) => prisma.jurusan.update({ where: { kode: "AKL" }, data: { kuota } });
    afterAll(async () => {
      await aturKuota(72);
    });

    it("jurusan penuh ditolak saat kirim dan saat menyimpan langkah jurusan; terbuka lagi setelah kuota dinaikkan", async () => {
      await aturKuota(1);
      const a = (await buatDraf()).token;
      const b = (await buatDraf()).token;
      await isiLengkap(a);
      await isiLengkap(b); // keduanya memilih AKL saat kuota masih kosong

      await kirimPendaftaran(a, true);
      const g = await galat(kirimPendaftaran(b, true));
      expect([g.status, g.code, g.errors?.jurusan_1?.[0]]).toEqual([409, "KUOTA_PENUH", "Kuota jurusan AKL sudah penuh. Pilih jurusan lain."]);
      expect((await galat(simpanLangkah(b, 4, { jurusan_1: "AKL" }))).code).toBe("KUOTA_PENUH");
      expect((await rekomendasiDraf(b)).kuotaPenuh).toEqual(["AKL"]);
      expect(await prisma.pendaftar.count()).toBe(1);

      await aturKuota(2);
      const { nomor } = await kirimPendaftaran(b, true);
      expect((await prisma.pendaftar.findUniqueOrThrow({ where: { nomorPendaftaran: nomor } })).statusVerifikasi).toBe("approved");
    });

    it("dua pengiriman bersamaan untuk sisa satu kursi: hanya satu yang diterima", async () => {
      await aturKuota(1);
      const tokens = await Promise.all([buatDraf(), buatDraf()].map(async (p) => (await p).token));
      for (const t of tokens) await isiLengkap(t);
      const hasil = await Promise.allSettled(tokens.map((t) => kirimPendaftaran(t, true)));
      expect(hasil.filter((h) => h.status === "fulfilled")).toHaveLength(1);
      expect(hasil.filter((h) => h.status === "rejected").map((h) => ((h as PromiseRejectedResult).reason as GalatApi).code)).toEqual(["KUOTA_PENUH"]);
      expect(await prisma.pendaftar.count()).toBe(1);
    });
  });

  it("menolak submit tanpa konfirmasi final atau sebelum semua langkah selesai", async () => {
    const { token } = await buatDraf();
    expect((await galat(kirimPendaftaran(token, true))).code).toBe("STEP_LOCKED");
    await isiLengkap(token);
    expect((await galat(kirimPendaftaran(token, false))).status).toBe(422);
  });

  it("halaman sukses hanya terbuka dengan token akses yang benar", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token);
    const { nomor, aksesToken } = await kirimPendaftaran(token, true);
    expect((await ambilRingkasanSukses(aksesToken))?.nomor).toBe(nomor);
    expect(await ambilRingkasanSukses("salah".padEnd(40, "x"))).toBeNull();
  });
});

describe("PDF formulir dari pendaftaran", () => {
  it("dibuat dari data tersimpan (terdekripsi) hanya untuk token akses yang benar", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token);
    const { nomor, aksesToken } = await kirimPendaftaran(token, true);

    const hasil = await formulirDariToken(aksesToken);
    expect(hasil?.nomor).toBe(nomor);
    expect(Buffer.from(hasil!.pdf.subarray(0, 5)).toString()).toBe("%PDF-");
    expect(await formulirDariToken("salah".padEnd(40, "x"))).toBeNull();
    expect(await formulirDariToken("pendek")).toBeNull();
  });
});

describe("cek status", () => {
  it("benar bila nomor dan tanggal lahir cocok; pesan sama untuk nomor salah dan tanggal salah", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token);
    const { nomor } = await kirimPendaftaran(token, true);

    const ok = await cekStatus({ nomor, tanggalLahir: "2011-05-17" }, "1.1.1.1");
    expect(ok.status).toBe("approved"); // langsung diterima (PRD 1.3 butir 62)
    expect(ok.jurusan1).toContain("AKL");

    const salahTanggal = await galat(cekStatus({ nomor, tanggalLahir: "2011-05-18" }, "1.1.1.1"));
    const salahNomor = await galat(cekStatus({ nomor: "SPMB-2027-9999", tanggalLahir: "2011-05-17" }, "1.1.1.1"));
    expect(salahTanggal.message).toBe(salahNomor.message);
    expect(salahTanggal.status).toBe(404);
  });

  it("dibatasi 10 pengecekan per menit per IP", async () => {
    for (let i = 0; i < 10; i++) await galat(cekStatus({ nomor: "X", tanggalLahir: "2011-05-17" }, "2.2.2.2"));
    expect((await galat(cekStatus({ nomor: "X", tanggalLahir: "2011-05-17" }, "2.2.2.2"))).status).toBe(429);
    // IP lain tidak terpengaruh
    expect((await galat(cekStatus({ nomor: "X", tanggalLahir: "2011-05-17" }, "3.3.3.3"))).status).toBe(404);
  });
});

describe("kompresi berkas wizard (poin B)", () => {
  const gambar = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: { r: 90, g: 120, b: 150 } } }).png().toBuffer();
  const bacaTemp = async (ref: string) => {
    const bagian: Buffer[] = [];
    for await (const b of await penyimpananTemp().ambilStream(ref)) bagian.push(Buffer.from(b));
    return Buffer.concat(bagian);
  };

  it("akta dikompres menjadi JPEG, ukuran tercatat dari hasil kompresi", async () => {
    const { token } = await buatDraf();
    const asli = await gambar(3000, 2000);
    const b = await unggahBerkas(token, "akta", asli, "akta.png");
    expect(b.mime).toBe("image/jpeg");
    expect(b.ref).toMatch(/\.jpg$/);
    const isi = await bacaTemp(b.ref);
    expect(b.ukuran).toBe(isi.length);
    expect(isi.length).toBeLessThan(asli.length);
    expect((await sharp(isi).metadata()).width).toBe(2000);
  });

  it("pas foto muat dalam 900x1200", async () => {
    const { token } = await buatDraf();
    const b = await unggahBerkas(token, "pas_foto", await gambar(1800, 2400), "foto.png");
    const m = await sharp(await bacaTemp(b.ref)).metadata();
    expect(m.width).toBeLessThanOrEqual(900);
    expect(m.height).toBeLessThanOrEqual(1200);
  });

  it("PDF tersimpan identik", async () => {
    const { token } = await buatDraf();
    const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(200, 7)]);
    const b = await unggahBerkas(token, "akta", pdf, "akta.pdf");
    expect((await bacaTemp(b.ref)).equals(pdf)).toBe(true);
  });
});
