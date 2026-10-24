// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { existsSync, mkdtempSync } from "node:fs";
import ExcelJS from "exceljs";
import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-dok-"));

const kirim = vi.hoisted(() => ({ mock: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: (...a: unknown[]) => kirim.mock(...a) }; } }));

import { buatPendaftarManual } from "@/server/actions/inputManual";
import { fieldEdit } from "@/server/actions/peserta";
import { prisma } from "@/server/db/client";
import { emailKodePendaftaran } from "@/server/email/kodePendaftaran";
import { kirimEmail } from "@/server/email/kirim";
import { buatFormulirPdf } from "@/server/services/pdf/formulir";
import { bersihkanDraf, jalankanHarian, periksaCron } from "@/server/services/cron";
import { buatDraf, muatDefinisiField, unggahBerkas } from "@/server/services/draf";
import { kirimKodePendaftaran, kirimUlangEmailTertunda } from "@/server/services/notifikasi";
import { kirimPendaftaran } from "@/server/services/pendaftaran";
import { buatRekapPdf, ringkasFilter } from "@/server/services/pdf/rekap";
import { simpanPengaturan } from "@/server/services/pengaturan";
import { buatXlsx } from "@/server/services/xlsx";
import type { GalatApi } from "@/server/types/galat";
import { seedFormField, seedReferensi } from "../../prisma/seed-lib";
import { buatPendaftarUji } from "../fixture-pendaftar";
import { PNG, isiLengkap, nilaiValid } from "../fixture-wizard";

void buatFormulirPdf;
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
  kirim.mock.mockReset();
  kirim.mock.mockResolvedValue({ data: { id: "x" }, error: null });
  delete process.env.RESEND_API_KEY;
  await prisma.user.create({ data: { id: BigInt(1), name: "Panitia", username: "panitia", passwordHash: "x", peran: "panitia" } });
  await simpanPengaturan("tahun_ajaran", AKTIF);
});
afterAll(async () => {
  await bersih();
  await prisma.bobotJurusan.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.jurusan.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.$disconnect();
});

async function isianManual(): Promise<Record<string, unknown>> {
  const isi: Record<string, unknown> = {};
  for (const f of fieldEdit(await muatDefinisiField())) if (f.tipe !== "tabel") isi[f.kunci] = nilaiValid(f);
  return isi;
}

async function isiHalaman(pdf: Uint8Array, h: number): Promise<string> {
  const doc = await PDFDocument.load(pdf);
  const c = doc.getPages()[h - 1].node.Contents();
  const daftar = c instanceof PDFArray ? c.asArray().map((r) => doc.context.lookup(r)) : [c];
  return daftar
    .filter((x): x is PDFRawStream => x instanceof PDFRawStream)
    .map((x) => Buffer.from(decodePDFRawStream(x).decode()).toString("latin1"))
    .join("\n");
}
const tampil = (t: string) => `<${Buffer.from(t, "latin1").toString("hex").toUpperCase()}> Tj`;

describe("ekspor XLSX", () => {
  it("memuat semua bagian, header hijau, NIK sebagai teks, dan kolom kustom; tanpa nilai rapor dan saran jurusan", async () => {
    await prisma.formField.create({ data: { kunci: "kustom_ukuran_sepatu", langkah: 5, label: "Ukuran sepatu", tipe: "text", urutan: 999, tampil: true, wajib: false, isKustom: true } });
    const { token } = await buatDraf();
    await isiLengkap(token);
    const { nomor } = await kirimPendaftaran(token, true);
    await prisma.pendaftar.updateMany({ where: { nomorPendaftaran: nomor }, data: { dataKustom: { kustom_ukuran_sepatu: "42" } } });

    const { buffer, jumlah } = await buatXlsx({}, AKTIF);
    expect(jumlah).toBe(1);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Data Pendaftar")!;
    expect(ws.rowCount).toBe(2);

    const kepala = ws.getRow(1);
    const kolom = (nama: string) => (kepala.values as string[]).indexOf(nama);
    expect(kepala.getCell(1).fill).toMatchObject({ fgColor: { argb: "FF057A3C" } });
    expect(kepala.getCell(1).font).toMatchObject({ bold: true, color: { argb: "FFFFFFFF" } });
    expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });

    const baris = ws.getRow(2);
    const sel = (nama: string) => baris.getCell(kolom(nama)).value;
    expect(sel("No. Pendaftaran")).toBe(nomor);
    expect(sel("NIK")).toBe("3302010101010001"); // teks, bukan angka
    expect(typeof sel("NIK")).toBe("string");
    expect(baris.getCell(kolom("NIK")).numFmt).toBe("@");
    expect(sel("NIK Ayah")).toBe("3302010101010003");
    expect(sel("NIK Ibu")).toBe("3302010101010004");
    expect(baris.getCell(kolom("NIK Ayah")).numFmt).toBe("@");
    expect(sel("NISN")).toBe("1234567890");
    expect(sel("Nama Lengkap")).toBe("Ahmad Fauzi");
    expect(sel("Jenis Kelamin")).toBe("Laki-laki");
    expect(sel("Penghasilan Orang Tua")).toBe("Kurang dari Rp500.000");
    // Nilai rapor dan saran jurusan tidak diekspor lagi (PRD 1.3 butir 65).
    for (const k of ["Rata-rata Matematika", "Skor AKL", "Saran Jurusan", "Status Nilai", "Versi Bobot"]) expect(kolom(k), k).toBe(-1);
    expect(kolom("Status Verifikasi")).toBe(-1); // kolom status dihapus (PRD 1.3 butir 63)
    expect(sel("Ukuran sepatu")).toBe("42");
    expect(ws.autoFilter).toBeTruthy();
  });

  it("hanya baris yang cocok dengan filter, termasuk periode dan status", async () => {
    await buatPendaftarUji({ nomor: "SPMB-2027-0001", nama: "Satu", status: "approved" });
    await buatPendaftarUji({ nomor: "SPMB-2027-0002", nama: "Dua", status: "pending" });
    await buatPendaftarUji({ nomor: "SPMB-2026-0001", nama: "Lama", periode: "2026/2027" });
    expect((await buatXlsx({}, AKTIF)).jumlah).toBe(2);
    expect((await buatXlsx({ status: "approved" }, AKTIF)).jumlah).toBe(1);
    expect((await buatXlsx({ periode: "semua" }, AKTIF)).jumlah).toBe(3);
    expect((await buatXlsx({ q: "tidak-ada" }, AKTIF)).jumlah).toBe(0);
  });
});

describe("rekap PDF", () => {
  it("A4 landscape dengan kop, ringkasan filter, nomor halaman, dan tanda tangan; banyak baris melahirkan beberapa halaman", async () => {
    for (let i = 1; i <= 70; i++) await buatPendaftarUji({ nomor: `SPMB-2027-${String(i).padStart(4, "0")}`, nama: `Peserta ${i}`, asalSekolah: "SMP Negeri 1 Wangon" });
    await buatPendaftarUji({ nomor: "SPMB-2027-0100", nama: "Zoë 田中 Aksen" }); // karakter di luar WinAnsi tidak boleh merusak PDF

    const { pdf, jumlah } = await buatRekapPdf({ status: "pending" }, AKTIF);
    expect(jumlah).toBe(71);
    const doc = await PDFDocument.load(pdf);
    const n = doc.getPageCount();
    expect(n).toBeGreaterThanOrEqual(3);
    const { width, height } = doc.getPages()[0].getSize();
    expect(width).toBeGreaterThan(height);
    expect(width).toBeCloseTo(841.89, 1);

    const h1 = await isiHalaman(pdf, 1);
    expect(h1).toContain(tampil("REKAPITULASI PENDAFTAR SPMB"));
    expect(h1).toContain(tampil("SMK MA'ARIF NU 1 WANGON"));
    expect(h1).toContain(tampil("SPMB-2027-0001"));
    expect(h1).toContain(tampil(`Halaman 1 dari ${n}`));
    expect(await isiHalaman(pdf, n)).toContain(tampil("Ketua Panitia SPMB"));
    expect(await isiHalaman(pdf, 2)).toContain(tampil("Nomor".length ? "No. Pendaftaran" : "")); // kepala tabel diulang
  });

  it("filter kosong menghasilkan dokumen dengan pesan, dan ringkasan filter terbaca", async () => {
    const { pdf, jumlah } = await buatRekapPdf({ status: "rejected" }, AKTIF);
    expect(jumlah).toBe(0);
    expect(await isiHalaman(pdf, 1)).toContain(tampil("Tidak ada pendaftar yang cocok dengan filter ini."));
    expect(ringkasFilter({ jurusan: "AKL", q: "budi" }, AKTIF)).toBe('Periode 2027/2028, pilihan 1 AKL, kata kunci "budi"'); // status tidak lagi disaring (PRD 1.3 butir 63)
  });
});

describe("email kode pendaftaran", () => {
  const data = { nomor: "SPMB-2027-0007", nama: "Budi <b>Bold</b>", periode: AKTIF, situs: "https://spmb.contoh.sch.id", aksesToken: "tokenrahasia123", jurusan1: "AKL · Akuntansi", waGroup: "https://chat.whatsapp.com/abc" };

  it("subjek, nomor menonjol, tautan, daftar berkas, dan HTML dari pengguna di-escape", () => {
    const e = emailKodePendaftaran(data);
    expect(e.subjek).toBe("Kode Pendaftaran SPMB Anda: SPMB-2027-0007");
    expect(e.html).toContain("SPMB-2027-0007");
    expect(e.html).toContain("https://spmb.contoh.sch.id/daftar/sukses/tokenrahasia123");
    expect(e.html).toContain("https://spmb.contoh.sch.id/api/v1/pendaftar/tokenrahasia123/formulir?unduh=1");
    expect(e.html).toContain("https://chat.whatsapp.com/abc");
    expect(e.html).toContain("Pas foto 3 x 4");
    expect(e.html).not.toContain("<b>Bold</b>");
    expect(e.html).toContain("&lt;b&gt;Bold&lt;/b&gt;");
    expect(e.teks).toContain("Nomor pendaftaran: SPMB-2027-0007");
  });

  it("tanpa token tidak ada tautan bertoken; grup WA bukan https diabaikan", () => {
    const e = emailKodePendaftaran({ ...data, aksesToken: undefined, waGroup: "javascript:alert(1)" });
    expect(e.html).not.toContain("/daftar/sukses/");
    expect(e.html).not.toContain("javascript:");
    expect(e.html).toContain("/cek-status");
  });
});

describe("pengiriman email", () => {
  it("tanpa RESEND_API_KEY dilewati dan tidak memanggil layanan", async () => {
    const h = await kirimEmail({ ke: "a@b.id", subjek: "x", html: "<p>x</p>", teks: "x" });
    expect(h.status).toBe("dilewati");
    expect(kirim.mock).not.toHaveBeenCalled();
  });

  it("submit mengirim email sekali dengan tautan bertoken dan mencatat notifikasiEmailAt; pengiriman ulang diabaikan", async () => {
    process.env.RESEND_API_KEY = "re_uji";
    const { token } = await buatDraf();
    await isiLengkap(token);
    const { nomor, aksesToken } = await kirimPendaftaran(token, true);

    expect(kirim.mock).toHaveBeenCalledTimes(1);
    const arg = kirim.mock.mock.calls[0][0] as { to: string; subject: string; html: string; text: string };
    expect(arg.to).toBe("ahmad@contoh.id");
    expect(arg.subject).toBe(`Kode Pendaftaran SPMB Anda: ${nomor}`);
    expect(arg.html).toContain(`/daftar/sukses/${aksesToken}`);
    expect((await prisma.pendaftar.findFirstOrThrow()).notifikasiEmailAt).toBeInstanceOf(Date);

    await kirimPendaftaran(token, true); // klik ganda
    expect((await kirimKodePendaftaran(nomor, aksesToken)).dilewatiKarena).toBe("sudah-terkirim");
    expect(kirim.mock).toHaveBeenCalledTimes(1);
  });

  it("gagal kirim tidak menggagalkan pendaftaran, notifikasiEmailAt tetap kosong, dan cron mengulang", async () => {
    process.env.RESEND_API_KEY = "re_uji";
    kirim.mock.mockResolvedValue({ data: null, error: { message: "domain belum diverifikasi" } });
    const { token } = await buatDraf();
    await isiLengkap(token);
    const { nomor } = await kirimPendaftaran(token, true);
    expect(nomor).toMatch(/^SPMB-/);
    expect((await prisma.pendaftar.findFirstOrThrow()).notifikasiEmailAt).toBeNull();

    kirim.mock.mockResolvedValue({ data: { id: "y" }, error: null });
    const h = await kirimUlangEmailTertunda();
    expect(h).toMatchObject({ diproses: 1, terkirim: 1, gagal: 0 });
    expect((await prisma.pendaftar.findFirstOrThrow()).notifikasiEmailAt).toBeInstanceOf(Date);
    expect(((kirim.mock.mock.calls.at(-1)?.[0] as { html: string }).html)).not.toContain("/daftar/sukses/"); // token mentah tidak tersimpan
    expect((await kirimUlangEmailTertunda()).diproses).toBe(0);
  });

  it("tanpa email atau pendaftar luring tidak dikirimi", async () => {
    process.env.RESEND_API_KEY = "re_uji";
    const h = await buatPendaftarManual({ ...(await isianManual()), jurusan_1: "AKL", email: "" }, ctx);
    const p = await prisma.pendaftar.findUniqueOrThrow({ where: { id: BigInt(h.id) } });
    expect(p.email).toBeNull();
    expect((await kirimKodePendaftaran(p.nomorPendaftaran)).dilewatiKarena).toBe("tanpa-email");
    await buatPendaftarManual({ ...(await isianManual()), jurusan_1: "AKL", email: "luring@contoh.id" }, ctx);
    expect((await kirimUlangEmailTertunda()).diproses).toBe(0); // luring tidak masuk antrean kirim ulang
    expect(kirim.mock).not.toHaveBeenCalled();
  });
});

describe("tugas terjadwal", () => {
  const req = (auth?: string) => new Request("http://localhost/api/v1/cron/harian", { headers: auth ? { authorization: auth } : {} });

  it("dilindungi CRON_SECRET: mati tanpa rahasia (503), 401 untuk rahasia salah, lolos untuk yang benar", () => {
    delete process.env.CRON_SECRET;
    expect(() => periksaCron(req("Bearer apa-saja"))).toThrow(/CRON_SECRET/);
    process.env.CRON_SECRET = "rahasia-cron-uji-1234567890";
    const e = (() => {
      try {
        periksaCron(req());
      } catch (x) {
        return x as GalatApi;
      }
    })();
    expect(e?.status).toBe(401);
    expect(() => periksaCron(req("Bearer salah"))).toThrow();
    expect(() => periksaCron(req("Bearer rahasia-cron-uji-1234567890"))).not.toThrow();
    process.env.CRON_SECRET = "pendek";
    expect(() => periksaCron(req("Bearer pendek"))).toThrow(/minimal 16/);
  });

  it("bersihkan draf: kedaluwarsa dihapus, berkas sementara draf belum terkirim ikut dihapus, draf aktif dan berkas pendaftar aman", async () => {
    const lama = (await buatDraf()).token;
    await unggahBerkas(lama, "akta", PNG, "a.png");
    const aktif = (await buatDraf()).token;
    await unggahBerkas(aktif, "akta", PNG, "b.png");
    const kirimToken = (await buatDraf()).token;
    await isiLengkap(kirimToken);
    await kirimPendaftaran(kirimToken, true);

    const sebelum = await prisma.pendaftaranDraft.findMany();
    expect(sebelum).toHaveLength(3);
    const refLama = ((sebelum.find((d) => d.submittedAt === null && (d.berkas as Record<string, { ref: string }>).akta && d.id !== undefined) ?? sebelum[0]).berkas as Record<string, { ref: string }>).akta.ref;
    void refLama;

    // kedaluwarsakan draf pertama dan draf terkirim
    await prisma.pendaftaranDraft.updateMany({ where: { OR: [{ submittedAt: { not: null } }, { berkas: { path: ["akta", "nama"], equals: "a.png" } }] }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const refPendaftar = (((await prisma.pendaftar.findFirstOrThrow()).berkasMeta as Record<string, { ref: string }>).akta).ref;
    const refAktif = (((await prisma.pendaftaranDraft.findFirstOrThrow({ where: { expiresAt: { gt: new Date() } } })).berkas as Record<string, { ref: string }>).akta).ref;
    const refKedaluwarsa = (((await prisma.pendaftaranDraft.findFirstOrThrow({ where: { berkas: { path: ["akta", "nama"], equals: "a.png" } } })).berkas as Record<string, { ref: string }>).akta).ref;

    const h = await bersihkanDraf();
    expect(h.drafDihapus).toBe(2);
    expect(h.berkasDihapus).toBe(1);
    expect(await prisma.pendaftaranDraft.count()).toBe(1);

    const { penyimpananTemp } = await import("@/server/services/penyimpanan");
    expect(await penyimpananTemp().ada(refKedaluwarsa)).toBe(false);
    expect(await penyimpananTemp().ada(refAktif)).toBe(true);
    expect(await penyimpananTemp().ada(refPendaftar)).toBe(true); // milik pendaftar yang belum tersinkron ke Drive
    expect(existsSync(process.env.DRAF_TEMP_DIR!)).toBe(true);
  });

  it("harian menjalankan semua tugas; satu tugas bermasalah tidak menghentikan yang lain", async () => {
    process.env.RESEND_API_KEY = "re_uji";
    const h = (await jalankanHarian()) as Record<string, Record<string, unknown>>;
    expect(Object.keys(h).sort()).toEqual(["bersihDraf", "catatanLaju", "emailTertunda", "sinkronDrive"]);
    expect(h.sinkronDrive.dilewati).toMatch(/belum terhubung/);
    expect(h.bersihDraf.drafDihapus).toBe(0);
  });
});
