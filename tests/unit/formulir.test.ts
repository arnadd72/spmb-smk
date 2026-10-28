// @vitest-environment node
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { DALAM_PAS_FOTO, buatFormulirPdf, nilaiSlot, siapkanPasFoto, type DataFormulir } from "@/server/services/pdf/formulir";
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

  it("semua isian tergambar di halaman yang benar, huruf besar kecuali email (tampilan baru, PRD 1.3 butir 79)", async () => {
    const { jejak } = await buatFormulirPdf(contoh);
    const nilai = nilaiSlot(contoh);
    const di = (h: number, teks: string) => jejak.some((j) => j.h === h && j.teks === teks);
    for (const k of ["nama", "ttl", "nisn", "nik", "noKk", "agama", "asalSekolah", "noHp", "ayahNama", "ibuNama", "ortuDesa", "ortuNoHp"]) {
      expect(di(1, nilai[k].toUpperCase()), k).toBe(true);
    }
    expect(di(1, "ahmad@contoh.id")).toBe(true);
    for (const k of ["smpNama", "smpKecamatan", "lamaBelajar", "golonganDarah", "tinggiBadan", "hobiOlahraga", "referensi", "tanggalSurat"]) {
      expect(di(2, nilai[k].toUpperCase()), k).toBe(true);
    }
    // Dua lembar tanda terima di halaman 3.
    expect(jejak.filter((j) => j.h === 3 && j.teks === `SPMB-2027-0001 / ${contoh.jurusan1?.kode}`)).toHaveLength(2);
  });

  it("judul, tahun pelajaran, dan judul tanda terima tetap satu teks di konten halaman", async () => {
    const { pdf } = await buatFormulirPdf(contoh);
    const h1 = await isiHalaman(pdf, 1);
    expect(h1).toContain(tampil("FORMULIR SISTEM PENERIMAAN MURID BARU"));
    expect(h1).toContain(tampil("TAHUN AJARAN 2027/2028"));
    expect(h1).toContain(tampil("AHMAD FAUZI RAHMAN"));
    const h3 = await isiHalaman(pdf, 3);
    expect(h3.split(tampil("TANDA TERIMA")).length - 1).toBe(2);
  });

  it("nomor ijazah dan Nilai Ujian tidak ada lagi walau data lama punya nilai ujian (PRD 1.3 butir 77)", async () => {
    const { pdf } = await buatFormulirPdf(contoh); // contoh masih membawa nilaiUjian dari data lama
    const semua = (await isiHalaman(pdf, 1)) + (await isiHalaman(pdf, 2));
    for (const t of ["No. Ijazah", "Nomor dan Tahun Ijazah", "Nilai Ujian", "DELAPAN PULUH LIMA"]) expect(semua).not.toContain(tampil(t));
  });

  it("isian kosong tetap digambar sebagai kotak kosong untuk ditulis tangan", async () => {
    const { pdf, jejak } = await buatFormulirPdf({ ...contoh, agama: null, hobiLain: null });
    expect(jejak.some((j) => j.teks === "ISLAM")).toBe(false);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(3);
  });

  it("pas foto ditempel di kotak halaman 2 tanpa mengubah jumlah halaman", async () => {
    const foto = await sharp({ create: { width: 300, height: 400, channels: 3, background: { r: 200, g: 20, b: 20 } } }).png().toBuffer();
    const { pdf } = await buatFormulirPdf({ ...contoh, pasFoto: foto });
    const { pdf: tanpa } = await buatFormulirPdf(contoh);
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(3);
    expect(pdf.length).toBeGreaterThan(tanpa.length);
  });

  it("pas foto memenuhi kotak tanpa dipotong: sisa ruang diisi latar foto yang dikaburkan", async () => {
    const rasio = DALAM_PAS_FOTO.w / DALAM_PAS_FOTO.h;
    // Foto 3x4 hampir pas dengan kotak 3x4: tidak ada yang terpotong, lebar dan tinggi asli tetap.
    const pas34 = await sharp(await siapkanPasFoto(await sharp({ create: { width: 300, height: 400, channels: 3, background: "#cc1414" } }).png().toBuffer())).metadata();
    expect(pas34.width).toBe(300);
    expect(pas34.height).toBeGreaterThanOrEqual(400);
    expect(pas34.height).toBeLessThanOrEqual(404);

    // Foto ramping (HP) berlatar merah dengan "wajah" putih di tengah: diperlebar ke kiri dan kanan dengan merah.
    const wajah = await sharp({ create: { width: 100, height: 160, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer();
    const foto = await sharp({ create: { width: 300, height: 500, channels: 3, background: { r: 200, g: 20, b: 20 } } })
      .composite([{ input: wajah, left: 100, top: 40 }])
      .png()
      .toBuffer();
    const hasil = await sharp(await siapkanPasFoto(foto)).raw().toBuffer({ resolveWithObject: true });
    expect(hasil.info.width / hasil.info.height).toBeCloseTo(rasio, 2);
    expect(hasil.info.height).toBe(500); // tinggi utuh: tidak ada yang terpotong
    const piksel = (x: number, y: number) => [...hasil.data.subarray((y * hasil.info.width + x) * 3, (y * hasil.info.width + x) * 3 + 3)];
    for (const x of [0, hasil.info.width - 1]) {
      const [r, g, b] = piksel(x, 250);
      // Merah (kompresi JPEG sedikit menggeser warna).
      expect(r).toBeGreaterThan(170);
      expect(r - Math.max(g, b)).toBeGreaterThan(120);
    }
    expect(Math.min(...piksel(Math.round(hasil.info.width / 2), 120))).toBeGreaterThan(240); // wajah tetap di tengah

    // Foto mendatar: lebar utuh, diperpanjang ke atas dan bawah.
    const datar = await sharp({ create: { width: 800, height: 500, channels: 3, background: { r: 30, g: 60, b: 200 } } }).png().toBuffer();
    const h2 = await sharp(await siapkanPasFoto(datar)).metadata();
    expect(h2.width).toBe(800);
    expect((h2.width ?? 0) / (h2.height ?? 1)).toBeCloseTo(rasio, 2);
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
