// @vitest-environment node
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buatFormulirPdf, nilaiSlot, type DataFormulir } from "@/server/services/pdf/formulir";
import { SLOT_TEKS } from "@/server/services/pdf/peta-formulir";
import { terbilang } from "@/server/services/pdf/terbilang";

const contoh: DataFormulir = {
  nomor: "SPMB-2027-0001",
  periode: "2027/2028",
  dikirimPada: new Date("2026-10-11T04:00:00Z"),
  tanggalVerifikasi: null,
  namaLengkap: "Ahmad Fauzi Rahman",
  tempatLahir: "Banyumas",
  tanggalLahir: new Date("2011-05-17T00:00:00Z"),
  nisn: "1234567890",
  nik: "3302010101010001",
  noKk: "3302010101010002",
  jenisKelamin: "L",
  agama: "Islam",
  anakKe: 2,
  jumlahSaudara: 3,
  asalSekolah: "SMP Negeri 1 Wangon",
  tamatTahun: "2027",
  noIjazah: "DN-03/D-SMP/27/0012345",
  noHp: "081234567890",
  email: "ahmad@contoh.id",
  rt: "02",
  rw: "04",
  desa: "Karangjengkol",
  kecamatan: "Wangon",
  kabupaten: "Banyumas",
  namaAyah: "Slamet Riyadi",
  ayahTempatLahir: "Banyumas",
  ayahTanggalLahir: new Date("1980-03-03T00:00:00Z"),
  ayahTtl: "Banyumas, 3 Maret 1980",
  ayahPendidikan: "SMA/SMK",
  pekerjaanAyah: "Wiraswasta",
  namaIbu: "Siti Aminah",
  ibuTempatLahir: "Cilacap",
  ibuTanggalLahir: new Date("1983-07-12T00:00:00Z"),
  ibuTtl: "Cilacap, 12 Juli 1983",
  ibuPendidikan: "SMP",
  pekerjaanIbu: "Ibu Rumah Tangga",
  ortuRt: "02",
  ortuRw: "04",
  ortuDesa: "Karangjengkol",
  ortuKecamatan: "Wangon",
  ortuKabupaten: "Banyumas",
  ortuPropinsi: "Jawa Tengah",
  noHpOrtu: "081298765432",
  penghasilan: "03",
  referensiPendaftar: "Kakak kelas",
  smpKecamatan: "Wangon",
  smpKabupaten: "Banyumas",
  smpPropinsi: "Jawa Tengah",
  ijazahNomorTahun: "DN-03/D-SMP/27/0012345 / 2027",
  lamaBelajar: "3",
  nilaiUjian: { b_indonesia: 85, b_inggris: 78.5, matematika: 90, ipa: 100 },
  golonganDarah: "O",
  tinggiBadan: 160,
  beratBadan: 50,
  penyakitPernahDiderita: "Tidak ada",
  hobiOlahraga: "Sepak bola",
  hobiKesenian: "Hadroh",
  hobiOrganisasi: "OSIS",
  hobiPrestasi: "Juara 2 lomba pidato tingkat kecamatan",
  hobiLain: "Membaca",
  ukuranSeragam: "L",
  jurusan1: { kode: "AKL", nama: "Akuntansi dan Keuangan Lembaga" },
  jurusan2: { kode: "LPK3", nama: "Layanan Penunjang Kefarmasian Klinis dan Komunitas" },
};

/** Seluruh content stream satu halaman (teks dari pdf-lib berupa string heksadesimal WinAnsi). */
async function isiHalaman(pdf: Uint8Array, h: number): Promise<string> {
  const doc = await PDFDocument.load(pdf);
  const node = doc.getPages()[h - 1].node;
  const c = node.Contents();
  const daftar = c instanceof PDFArray ? c.asArray().map((r) => doc.context.lookup(r)) : [c];
  return daftar
    .filter((x): x is PDFRawStream => x instanceof PDFRawStream)
    .map((x) => Buffer.from(decodePDFRawStream(x).decode()).toString("latin1"))
    .join("\n");
}

const tampil = (teks: string) => `<${Buffer.from(teks, "latin1").toString("hex").toUpperCase()}> Tj`;

describe("PDF formulir (PRD 15.1)", () => {
  it("menghasilkan 3 halaman berukuran sama dengan template", async () => {
    const { pdf } = await buatFormulirPdf(contoh);
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(3);
    const { width, height } = doc.getPages()[0].getSize();
    expect(width).toBeCloseTo(612.12, 1);
    expect(height).toBeCloseTo(936.12, 1);
    if (process.env.SIMPAN_PDF) {
      mkdirSync(path.join(process.cwd(), ".local"), { recursive: true });
      writeFileSync(path.join(process.cwd(), ".local", "contoh-formulir.pdf"), pdf);
    }
  });

  it("setiap isian terisi pada koordinat hasil pemetaan, di halaman yang benar", async () => {
    const { jejak } = await buatFormulirPdf(contoh);
    const nilai = nilaiSlot(contoh);
    for (const s of SLOT_TEKS) {
      if (!nilai[s.id]) continue;
      const j = jejak.find((x) => x.id === s.id);
      expect(j, `slot ${s.id} tidak tergambar`).toBeDefined();
      expect(j?.h).toBe(s.h);
      expect(j?.y).toBe(s.y);
      expect(j!.x).toBeGreaterThanOrEqual(s.x - 0.01);
      expect(j!.x).toBeLessThanOrEqual(s.x + s.maks);
    }
    // contoh: nomor tampil di halaman 1 dan di dua lembar tanda terima
    expect(jejak.filter((j) => /^(nomor|ttANomor|ttBNomor)$/.test(j.id)).map((j) => j.h).sort()).toEqual([1, 3, 3]);
  });

  it("teks panjang mengecil agar tetap muat di lebar garis, tidak keluar dari kolom", async () => {
    const { jejak } = await buatFormulirPdf({ ...contoh, namaLengkap: "MUHAMMAD ABDURRAHMAN AL-FARUQ RADEN MAS SURYONINGRAT KUSUMA".repeat(2) });
    const nama = jejak.find((j) => j.id === "nama")!;
    expect(nama.ukuran).toBeLessThan(11);
    const tt = jejak.find((j) => j.id === "ttANomor")!;
    expect(tt.ukuran).toBeLessThanOrEqual(8);
  });

  it("isian dan tahun pelajaran ada di konten halaman; tahun lama di template ditutup", async () => {
    const { pdf } = await buatFormulirPdf(contoh);
    const h1 = await isiHalaman(pdf, 1);
    expect(h1).toContain(tampil("AHMAD FAUZI RAHMAN"));
    expect(h1).toContain(tampil("2027/2028"));
    const h3 = await isiHalaman(pdf, 3);
    expect(h3.split(tampil("2027 / 2028")).length - 1).toBe(2);
    expect(h3).toContain(tampil("SPMB-2027-0001"));
  });

  it("karakter di luar WinAnsi diganti aman, tidak melempar galat", async () => {
    await expect(buatFormulirPdf({ ...contoh, namaLengkap: "Ahmad 😀 Zoë 田中" })).resolves.toBeDefined();
  });

  it("email tetap huruf kecil, sisanya huruf besar", () => {
    const n = nilaiSlot(contoh);
    expect(n.email).toBe("ahmad@contoh.id");
    expect(n.ttl).toBe("Banyumas, 17 MEI 2011");
  });

  it("menggabungkan field lahir orang tua untuk PDF dan memakai TTL lama sebagai fallback", () => {
    const n = nilaiSlot(contoh);
    expect(n.ayahTtl).toBe("Banyumas, 3 MARET 1980");
    expect(n.ibuTtl).toBe("Cilacap, 12 JULI 1983");
    const lama = nilaiSlot({ ...contoh, ayahTempatLahir: null, ayahTanggalLahir: null, ibuTempatLahir: null, ibuTanggalLahir: null });
    expect(lama.ayahTtl).toBe("Banyumas, 3 Maret 1980");
    expect(lama.ibuTtl).toBe("Cilacap, 12 Juli 1983");
  });
});

describe("terbilang", () => {
  it.each([
    [0, "nol"],
    [7, "tujuh"],
    [11, "sebelas"],
    [15, "lima belas"],
    [20, "dua puluh"],
    [85, "delapan puluh lima"],
    [100, "seratus"],
    [78.5, "tujuh puluh delapan koma lima"],
  ])("%s -> %s", (n, kata) => expect(terbilang(n)).toBe(kata));
});
