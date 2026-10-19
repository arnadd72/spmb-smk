// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-draf-"));

import { prisma } from "@/server/db/client";
import { ambilDraf, bacaData, buatDraf, hapusDraf, muatDefinisiField, rekomendasiDraf, simpanLangkah, unggahBerkas } from "@/server/services/draf";
import { dekripsi, enkripsi } from "@/server/services/kripto";
import { cekStatus, kirimPendaftaran, ambilRingkasanSukses } from "@/server/services/pendaftaran";
import { formulirDariToken } from "@/server/services/pdf/formulir";
import { simpanPengaturan } from "@/server/services/pengaturan";
import { hitungRekomendasi, muatBobotJurusan } from "@/server/services/rekomendasi";
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

const galat = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as GalatApi;
  }
  throw new Error("Seharusnya melempar galat.");
};

describe("rekomendasi jurusan (PRD 12.4)", () => {
  it("membaca pilihan FKK dari draf lama sebagai LPK3", () => {
    const baris = {
      data: { v: enkripsi(JSON.stringify({ "4": { jurusan_1: "FKK", jurusan_2: "AKL" } })) },
    } as unknown as Parameters<typeof bacaData>[0];
    expect(bacaData(baris)["4"]).toEqual({ jurusan_1: "LPK3", jurusan_2: "AKL" });
  });

  it("tanpa nilai rapor, rekomendasi kosong dan pilihan jurusan tetap manual", async () => {
    const { token } = await buatDraf();
    await simpanLangkah(token, 1, { nama_lengkap: "Siti Aminah", nisn: "1234567890", tanggal_lahir: "2011-02-03", setuju: true });
    await simpanLangkah(token, 2, {});
    await simpanLangkah(token, 3, { nilai_rapor: { mapel: {} }, sumber_nilai: "manual" });
    expect((await rekomendasiDraf(token)).peringkat).toEqual([]);
    await simpanLangkah(token, 4, { jurusan_1: "AKL", jurusan_2: "" });
    expect((await ambilDraf(token))?.data["4"]?.jurusan_1).toBe("AKL");
  });

  it("Matematika dan IPS tinggi menjadikan AKL paling sesuai", async () => {
    const bobot = await muatBobotJurusan();
    const dasar = { "1": 75 };
    const r = hitungRekomendasi(
      {
        semester: [1],
        mapel: {
          matematika: { "1": 90 }, ips: { "1": 86 }, b_indonesia: { "1": 80 }, ipa: { "1": 70 },
          b_inggris: dasar, informatika: dasar, prakarya: dasar, pai: dasar,
        },
      },
      bobot,
    );
    expect(r.peringkat[0].kode).toBe("AKL");
    expect(r.peringkat[0].label).toBe("Paling Sesuai");
  });

  it("IPA dan Matematika tinggi menempatkan LPK3 atau TKR di peringkat 1-2, bukan AKL", async () => {
    const bobot = await muatBobotJurusan();
    const dasar = { "1": 75 };
    const r = hitungRekomendasi(
      {
        semester: [1],
        mapel: { ipa: { "1": 92 }, matematika: { "1": 85 }, ips: dasar, b_indonesia: dasar, b_inggris: dasar, informatika: dasar, prakarya: dasar, pai: dasar },
      },
      bobot,
    );
    expect(["LPK3", "TKR"]).toContain(r.peringkat[0].kode);
    expect(r.peringkat[0].kode).not.toBe("AKL");
  });

  it("rapor tanpa Informatika tetap dihitung dengan bobot dibagi ulang", async () => {
    const bobot = await muatBobotJurusan();
    const dasar = { "1": 80 };
    const r = hitungRekomendasi(
      { semester: [1], mapel: { matematika: dasar, ips: dasar, b_indonesia: dasar, b_inggris: dasar } },
      bobot,
    );
    const akl = r.peringkat.find((p) => p.kode === "AKL");
    expect(akl?.skor).toBe(80);
    expect(akl?.rincian.reduce((a, m) => a + m.bobot, 0)).toBeCloseTo(1, 1);
  });

  it("jurusan dengan lebih dari 50% bobot tanpa data diberi label Data Kurang", async () => {
    const bobot = await muatBobotJurusan();
    const r = hitungRekomendasi({ semester: [1], mapel: { matematika: { "1": 80 } } }, bobot);
    expect(r.peringkat.find((p) => p.kode === "LPK3")?.label).toBe("Data Kurang");
  });

  it("versi berubah saat bobot diubah", async () => {
    const bobot = await muatBobotJurusan();
    const a = hitungRekomendasi({ semester: [1], mapel: {} }, bobot).versi;
    const ubah = structuredClone(bobot);
    ubah[0].bobot[0].bobot += 0.05;
    expect(hitungRekomendasi({ semester: [1], mapel: {} }, ubah).versi).not.toBe(a);
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

  it("jurusan 2 tidak boleh sama dengan jurusan 1", async () => {
    const fields = await muatDefinisiField();
    const r = skemaLangkah(fields, 4).safeParse({ jurusan_1: "AKL", jurusan_2: "AKL" });
    expect(r.success).toBe(false);
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
    expect(ok.status).toBe("pending");
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
