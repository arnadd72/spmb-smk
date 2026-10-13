// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bersihkanTeks, cariDeret16, kemiripanNama, parseTanggal, susunBaris } from "@/lib/ocr/normalisasi";
import { parseAkta } from "@/lib/ocr/parser/akta";
import { parseKk } from "@/lib/ocr/parser/kk";
import { deteksiSemester, parseRapor } from "@/lib/ocr/parser/rapor";
import type { BarisOcr, MapelRef } from "@/lib/ocr/tipe";

/** Satu potongan teks per baris, tersusun ke bawah (cukup untuk parser berbasis label). */
const dariBaris = (baris: string[]): BarisOcr[] =>
  baris.map((teks, i) => ({ teks, kotak: [0, i * 40, 600, i * 40 + 30], skor: 0.95 }));

/** Sel tabel: [teks, x]. Satu baris tabel = beberapa sel pada y yang sama. */
const barisTabel = (y: number, sel: [string, number][]): BarisOcr[] =>
  sel.map(([teks, x]) => ({ teks, kotak: [x, y, x + Math.max(40, teks.length * 12), y + 30], skor: 0.95 }));

describe("normalisasi", () => {
  it("membuang huruf non-Latin dari stempel", () => {
    expect(bersihkanTeks("1E电S线 S2 酸 :13")).toBe("1E S S2 :13");
  });

  it("memperbaiki angka tertukar huruf pada deret 16 digit, tetapi tidak menebak 15 atau 17 digit", () => {
    expect(cariDeret16("NIK 3301012204780001")).toEqual([{ nilai: "3301012204780001", diperbaiki: false }]);
    expect(cariDeret16("NIK 33O1012204780OO1")).toEqual([{ nilai: "3301012204780001", diperbaiki: true }]);
    expect(cariDeret16("330101230210")).toEqual([]);
    expect(cariDeret16("33010123021000001")).toEqual([]);
  });

  it("membaca tanggal berbagai format dan tahun yang tertukar huruf", () => {
    expect(parseTanggal("12-05-2010")).toBe("2010-05-12");
    expect(parseTanggal("12 Mei 2010")).toBe("2010-05-12");
    expect(parseTanggal("CILACAP, 12 Mei 2010")).toBe("2010-05-12");
    expect(parseTanggal("22-04.197B")).toBe("1978-04-22");
    expect(parseTanggal("31-02-2010")).toBeNull();
    expect(parseTanggal("tidak ada tanggal")).toBeNull();
  });

  it("mencocokkan nama walau kata menempel atau urutannya berbeda", () => {
    expect(kemiripanNama("Siti Nurhaliza", "SITINURHALIZA")).toBeGreaterThan(0.9);
    expect(kemiripanNama("Nurhaliza Siti", "SITI NURHALIZA")).toBeGreaterThan(0.9);
    expect(kemiripanNama("Ahmad Fauzi", "Budi Santoso")).toBeLessThan(0.5);
  });

  it("menyusun potongan sejajar menjadi satu baris berurutan dari kiri ke kanan", () => {
    const baris = susunBaris([
      { teks: "B", kotak: [200, 10, 240, 40], skor: 0.9 },
      { teks: "A", kotak: [20, 12, 60, 42], skor: 0.9 },
      { teks: "C", kotak: [20, 100, 60, 130], skor: 0.9 },
    ]);
    expect(baris.map((b) => b.teks)).toEqual(["A B", "C"]);
  });
});

// Teks nyata dari uji KK di HP (data pribadi disamarkan: NIK dan nama diganti, kesalahan baca OCR dipertahankan).
const KK_HP = [
  "K 33010391432",
  "KARTUKELUARGA",
  "No.3301010406080001",
  "Nama Kepala Keluarga:sUTARNO Kecanatan KEDUNGREJA",
  "Alamat :DUSUN SIDAURIP KabupatenMota:CILACAP",
  "RT/RW :003/003 KodePos 53263",
  "Kelurahan/Desa : SIDANEGARA ProvInsi JAWA TENGAH",
  "No. Nama Lengkap NIK JenisKelanin TempatLahir TanggalLahir Agama",
  "1 SUTARNO 3301012204780001 LAKILAKI CILACAP 22-04.197B ISLAM1SLTA/SEDERAJAT PETANI/PEKEBUN",
  "2 LISA TRI SAPARININGRUM 3301018611830003 PEREMPUAN CILACAP 28-11-1983 ISLAM AKADEMI/DIPLOMA Hl/S MUDA PETANI/PEKEBUN",
  "3 ARNANDA SETYANOSA PUTRA 3301010903060002 LAKI-LAKI CILACAP 09-03-2006 ISLAM TIDAK/BELUM SEKOLAH BELUM/TIDAK BEKERJA",
  "4 RIVADO MAULUDI 3301012302100/LAKLAKI CHACAP 23-02-2010 ISU JIDAKBEUM SEKOLAH BELUMTDAKBEKERJA",
  "io Status Status Hubungan Daiai Kcuaiga KEvwaigácegaisai",
  "9鲜 10",
  "SUMINAH",
];

describe("parseKk", () => {
  it("membaca nomor KK, alamat, dan wilayah dari tata letak dua kolom", () => {
    const h = parseKk(dariBaris(KK_HP), "Arnanda Setyanosa Putra");
    expect(h.fields.no_kk).toEqual({ nilai: "3301010406080001", keyakinan: "HIGH" });
    expect(h.fields.alamat.nilai).toBe("DUSUN SIDAURIP");
    expect(h.fields.rt.nilai).toBe("003");
    expect(h.fields.rw.nilai).toBe("003");
    expect(h.fields.desa.nilai).toBe("SIDANEGARA");
    expect(h.fields.kecamatan.nilai).toBe("KEDUNGREJA");
    expect(h.fields.kabupaten.nilai).toBe("CILACAP");
    expect(h.fields.propinsi.nilai).toBe("JAWA TENGAH");
  });

  it("memilih NIK dari anggota yang namanya paling mirip, bukan NIK pertama", () => {
    const h = parseKk(dariBaris(KK_HP), "ARNANDA SETYANOSA PUTRA");
    expect(h.fields.nik).toEqual({ nilai: "3301010903060002", keyakinan: "HIGH" });
  });

  it("tidak menebak NIK yang rusak (15 digit): kosong dengan peringatan", () => {
    const h = parseKk(dariBaris(KK_HP), "Rivado Mauludi");
    expect(h.fields.nik.nilai).toBe("");
    expect(h.peringatan.join(" ")).toMatch(/NIK calon siswa tidak terbaca/);
  });

  it("memberi peringatan bila nama siswa tidak ada di KK", () => {
    const h = parseKk(dariBaris(KK_HP), "Budi Hartono Wijaya");
    expect(h.fields.nik.keyakinan).toBe("NOT_FOUND");
    expect(h.peringatan.join(" ")).toMatch(/tidak ditemukan di Kartu Keluarga/);
  });

  it("mengisi nama ayah dan ibu cadangan dari anggota yang 15 tahun lebih tua", () => {
    const h = parseKk(dariBaris(KK_HP), "Arnanda Setyanosa Putra");
    expect(h.fields.nama_ayah).toEqual({ nilai: "SUTARNO", keyakinan: "MEDIUM" });
    expect(h.fields.nama_ibu).toEqual({ nilai: "LISA TRI SAPARININGRUM", keyakinan: "MEDIUM" });
  });

  it("KK kosong menghasilkan semua field kosong tanpa galat", () => {
    const h = parseKk(dariBaris(["foto buram", "tidak ada apa-apa"]), "Siapa Saja");
    expect(h.fields.no_kk.nilai).toBe("");
    expect(h.anggota).toHaveLength(0);
    expect(h.peringatan.length).toBeGreaterThan(0);
  });
});

describe("parseAkta", () => {
  const AKTA = [
    "KUTIPAN AKTA KELAHIRAN",
    "Nomor : 3301-LT-15052010-0123",
    "Nama : AHMAD FAUZI RAMADHAN",
    "Tempat/Tanggal Lahir : CILACAP, 12 Mei 2010",
    "Jenis Kelamin : LAKI-LAKI",
    "Nama Ayah : SUPARNO",
    "Nama Ibu : SITI NURHALIZA",
  ];

  it("membaca tempat lahir, jenis kelamin, dan nama orang tua", () => {
    const h = parseAkta(dariBaris(AKTA), "Ahmad Fauzi Ramadhan");
    expect(h.fields.tempat_lahir.nilai).toBe("CILACAP");
    expect(h.fields.jenis_kelamin.nilai).toBe("L");
    expect(h.fields.nama_ayah.nilai).toBe("SUPARNO");
    expect(h.fields.nama_ibu.nilai).toBe("SITI NURHALIZA");
    expect(h.tanggalLahir).toBe("2010-05-12");
    expect(h.peringatan).toHaveLength(0);
  });

  it("memperingatkan bila nama Akta berbeda jauh dengan Langkah 1", () => {
    const h = parseAkta(dariBaris(AKTA), "Budi Hartono");
    expect(h.peringatan.join(" ")).toMatch(/berbeda dengan nama di Langkah 1/);
  });

  it("membaca nilai yang berada di baris setelah labelnya", () => {
    const h = parseAkta(dariBaris(["Nama Ibu", "SITI NURHALIZA", "Jenis Kelamin", "PEREMPUAN"]));
    expect(h.fields.nama_ibu.nilai).toBe("SITI NURHALIZA");
    expect(h.fields.jenis_kelamin.nilai).toBe("P");
  });

  it("Akta tak terbaca menghasilkan field kosong dan peringatan", () => {
    const h = parseAkta(dariBaris(["gelap"]));
    expect(h.fields.tempat_lahir.keyakinan).toBe("NOT_FOUND");
    expect(h.peringatan.join(" ")).toMatch(/tidak ditemukan/);
  });
});

const MAPEL: MapelRef[] = [
  { kode: "pai", nama: "Pendidikan Agama Islam", alias: ["agama islam", "pai"] },
  { kode: "mtk", nama: "Matematika", alias: ["matematika"] },
  { kode: "ipa", nama: "Ilmu Pengetahuan Alam", alias: ["ipa", "ilmu pengetahuan alam"] },
  { kode: "bing", nama: "Bahasa Inggris", alias: ["bahasa inggris", "b. inggris"] },
];

describe("parseRapor", () => {
  it("menyusun tabel dari koordinat dan mengabaikan nomor urut serta teks capaian", () => {
    const baris = [
      ...barisTabel(0, [["Semester : 2 (Genap)", 20]]),
      ...barisTabel(40, [["No", 20], ["Mata Pelajaran", 80], ["Nilai Akhir", 400], ["Capaian Kompetensi", 520]]),
      ...barisTabel(80, [["1", 20], ["Pendidikan Agama Islam dan Budi Pekerti", 80], ["88", 400], ["Menunjukkan penguasaan yang baik", 520]]),
      ...barisTabel(120, [["2", 20], ["Matematika", 80], ["76", 400], ["Perlu bimbingan", 520]]),
      ...barisTabel(160, [["3", 20], ["Ilmu Pengetahuan Alam", 80], ["82,5", 400], ["Baik", 520]]),
      ...barisTabel(200, [["4", 20], ["Seni Budaya", 80], ["90", 400]]),
    ];
    const h = parseRapor(baris, MAPEL);
    expect(h.semester).toBe(2);
    expect(h.nilai.pai).toEqual({ nilai: 88, keyakinan: "HIGH" });
    expect(h.nilai.mtk.nilai).toBe(76);
    expect(h.nilai.ipa.nilai).toBe(82.5);
    expect(h.nilai.bing).toBeUndefined();
    expect(h.tidakDikenali).toEqual([{ nama: "Seni Budaya", nilai: 90 }]);
  });

  it("memilih kolom Pengetahuan pada rapor K13, bukan Keterampilan", () => {
    const baris = [
      ...barisTabel(0, [["Mata Pelajaran", 80], ["Pengetahuan", 300], ["Keterampilan", 460]]),
      ...barisTabel(40, [["1", 20], ["Matematika", 80], ["78", 320], ["91", 480]]),
    ];
    expect(parseRapor(baris, MAPEL).nilai.mtk.nilai).toBe(78);
  });

  it("memperbaiki angka tertukar huruf dan membuang nilai di luar 0 sampai 100", () => {
    const baris = [
      ...barisTabel(0, [["Matematika", 80], ["8O", 400]]),
      ...barisTabel(40, [["Bahasa Inggris", 80], ["250", 400]]),
    ];
    const h = parseRapor(baris, MAPEL);
    expect(h.nilai.mtk.nilai).toBe(80);
    expect(h.nilai.bing).toBeUndefined();
  });

  it("memberi keyakinan MEDIUM untuk nama mapel yang agak berbeda", () => {
    const baris = barisTabel(0, [["Bhs Inggris", 80], ["84", 400]]);
    expect(parseRapor(baris, MAPEL).nilai.bing.keyakinan).toBe("MEDIUM");
  });

  it("halaman tanpa tabel menghasilkan hasil kosong", () => {
    const h = parseRapor(dariBaris(["foto gelap"]), MAPEL);
    expect(h.nilai).toEqual({});
    expect(h.semester).toBeNull();
  });
});

describe("deteksiSemester", () => {
  it.each([
    ["Semester : 3", 3],
    ["Kelas VII Semester 2", 2],
    ["Kelas VIII semester 1", 3],
    ["Kelas IX Genap", 6],
    ["Kelas VII Ganjil", 1],
    ["tanpa keterangan", null],
  ])("%s -> %s", (teks, hasil) => {
    expect(deteksiSemester(teks)).toBe(hasil);
  });
});
