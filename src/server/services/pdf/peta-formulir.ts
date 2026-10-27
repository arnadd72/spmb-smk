// Peta koordinat isian di atas template-dasar.pdf (PRD v4 15.1). Template = docs/template-formulir.docx
// diekspor Word ke PDF, 3 halaman 612.12 x 936.12 pt (Folio). Koordinat diukur dari PDF itu dengan sumbu Y
// ke bawah dari tepi atas (seperti tampilan), `y` = garis dasar titik-titik isian. Jangan diubah tanpa
// membandingkan hasil render dengan template.

export const LEBAR_HALAMAN = 612.12;
export const TINGGI_HALAMAN = 936.12;

export type Halaman = 1 | 2 | 3;

/**
 * Pita template yang dibuang (PRD 1.3 butir 77): [atas, bawah] atas-ke-bawah pada template asli. Isi di bawah pita
 * digeser naik sepanjang pita, jadi tidak ada ruang kosong. Diukur pdf.js dari garis dasar baris (huruf 12 pt).
 * Semua koordinat di berkas ini tetap ditulis dalam ukuran template asli lalu dipetakan lewat `geserY`.
 */
export const POTONGAN: Record<Halaman, [number, number][]> = {
  // "11. No. Ijazah" (garis dasar 441,3; baris 10 di 423,3, baris 12 di 459,3): baris 12 dst. naik 18 pt.
  1: [[432, 450]],
  2: [
    // "b. Nomor dan Tahun Ijazah" (garis dasar 180,1; baris c di 197,2 naik ke 180,1).
    [171, 188.1],
    // "d Nilai Ujian" sampai "4) IPA" (garis dasar 214,1 sampai 282,2). Judul C (316,1) naik ke 214, berjarak
    // 33,9 pt dari baris terakhir seperti jarak antarbagian aslinya.
    [204.6, 289.6],
  ],
  3: [],
};

/** Koordinat y template asli (atas-ke-bawah) setelah pita `POTONGAN` dibuang. */
export function geserY(h: Halaman, y: number): number {
  const naik = POTONGAN[h].filter(([, bawah]) => bawah <= y).reduce((a, [atas, bawah]) => a + bawah - atas, 0);
  return Math.round((y - naik) * 100) / 100;
}

/** Isian teks di atas garis titik-titik. `x` awal, `maks` lebar tersedia. */
export type SlotTeks = {
  id: string;
  h: Halaman;
  x: number;
  y: number;
  maks: number;
  /** Ukuran awal (pt). Mengecil otomatis sampai batas bawah bila tidak muat. */
  ukuran?: number;
  tebal?: boolean;
  tengah?: boolean;
  /** Pertahankan huruf kecil (email). Bawaan: HURUF BESAR sesuai petunjuk formulir. */
  asli?: boolean;
};

const T = (id: string, h: Halaman, x: number, y: number, maks: number, sisa: Partial<SlotTeks> = {}): SlotTeks => ({
  id,
  h,
  x,
  y: geserY(h, y),
  maks,
  ...sisa,
});

// Run titik-titik: x awal + 2 pt supaya tidak menempel titik pertama; lebar = panjang run - 4.
export const SLOT_TEKS: SlotTeks[] = [
  // Halaman 1, Bagian A
  T("nomor", 1, 174, 219.9, 68, { tebal: true, ukuran: 11 }),
  T("nama", 1, 236, 261.3, 303),
  T("ttl", 1, 236, 279.3, 300),
  T("nisn", 1, 236, 297.3, 312),
  T("nik", 1, 236, 315.3, 134),
  T("noKk", 1, 399, 315.3, 152),
  T("agama", 1, 236, 351.3, 312),
  T("anakKe", 1, 236, 369.3, 312),
  T("jumlahSaudara", 1, 236, 387.3, 312),
  T("asalSekolah", 1, 236, 405.3, 312),
  T("tamatTahun", 1, 236, 423.3, 312),
  T("noHp", 1, 236, 459.3, 312),
  T("email", 1, 236, 477.3, 312, { asli: true }),
  T("ayahNama", 1, 311, 513.3, 240),
  T("ayahTtl", 1, 311, 531.3, 230),
  T("ayahPendidikan", 1, 311, 549.3, 240),
  T("ayahPekerjaan", 1, 311, 567.3, 240),
  T("ibuNama", 1, 311, 603.3, 235),
  T("ibuTtl", 1, 311, 621.3, 240),
  T("ibuPendidikan", 1, 311, 639.3, 240),
  T("ibuPekerjaan", 1, 311, 657.3, 240),
  T("ortuRt", 1, 255, 693.3, 27, { tengah: true }),
  T("ortuRw", 1, 319, 693.3, 33, { tengah: true }),
  T("ortuDesa", 1, 385, 693.3, 165),
  T("ortuKecamatan", 1, 296, 711.3, 252),
  T("ortuKabupaten", 1, 291, 729.3, 258),
  T("ortuPropinsi", 1, 282, 747.3, 266),
  T("ortuNoHp", 1, 332, 765.3, 218),

  // Halaman 2, Bagian B sampai D
  T("smpNama", 2, 292, 112.1, 255),
  T("smpKecamatan", 2, 292, 129.1, 255),
  T("smpKabupaten", 2, 292, 146.2, 255),
  T("smpPropinsi", 2, 292, 163.1, 255),
  T("lamaBelajar", 2, 293, 197.2, 14, { tengah: true }),
  T("golonganDarah", 2, 292, 333.2, 240),
  T("tinggiBadan", 2, 292, 350.2, 90, { tengah: true }),
  T("beratBadan", 2, 432, 350.2, 93, { tengah: true }),
  T("penyakit", 2, 292, 367.1, 240),
  T("hobiOlahraga", 2, 264, 432.4, 282),
  T("hobiKesenian", 2, 264, 448.4, 282),
  T("hobiOrganisasi", 2, 264, 464.4, 282),
  T("hobiPrestasi", 2, 264, 480.4, 282),
  T("hobiLain", 2, 264, 496.4, 282),
  T("tanggalSurat", 2, 432, 575.6, 114),
  T("namaTtd", 2, 428, 665.6, 117, { tengah: true }),
  T("referensi", 2, 172, 709.8, 168),

  // Halaman 3, dua lembar tanda terima identik. Lembar kedua = lembar pertama + 435.8 pt ke bawah.
  ...[0, 435.8].flatMap((dy, i) => {
    const s = i === 0 ? "A" : "B";
    const y = (n: number) => Math.round((n + dy) * 10) / 10;
    return [
      // Nomor dan jurusan satu teks ("SPMB-2027-0001 / AKL") berukuran normal; "/" bawaan template ditutup (GARIS_MIRING_TT).
      T(`tt${s}Nomor`, 3, 255, y(123.1), 244),
      T(`tt${s}Nama`, 3, 255, y(138.1), 244),
      T(`tt${s}Sekolah`, 3, 255, y(153), 244),
      // Sedikit lebih lebar dari titik-titik template agar RT/RW tiga digit (mis. 006) tetap berukuran normal.
      T(`tt${s}Rt`, 3, 274, y(168), 18, { tengah: true }),
      T(`tt${s}Rw`, 3, 326, y(168), 18, { tengah: true }),
      T(`tt${s}Desa`, 3, 377, y(168), 121),
      T(`tt${s}Kecamatan`, 3, 255, y(182.9), 244),
      T(`tt${s}Kabupaten`, 3, 255, y(197.9), 244),
    ];
  }),
  // Bagian bawah lembar kedua berjarak 438 pt dari lembar pertama (bukan 435.8), diukur terpisah.
  T("ttADatang", 3, 401, 361.5, 127),
  T("ttAWangon", 3, 411, 381.4, 117),
  T("ttBDatang", 3, 410, 799.5, 117),
  T("ttBWangon", 3, 411, 819.5, 117),
];

/** Kotak yang ditandai. Koordinat: x0, y0 (atas), x1, y1 (bawah). */
export type Kotak = { x0: number; y0: number; x1: number; y1: number };
/** Kotak diukur pada template asli, dipetakan ke posisi setelah pita dipotong. */
const K = (h: Halaman, k: Kotak): Kotak => ({ ...k, y0: geserY(h, k.y0), y1: geserY(h, k.y1) });
export const KOTAK_GENDER: Record<"L" | "P", Kotak> = {
  L: { x0: 236.3, y0: 322.7, x1: 252.8, y1: 334.7 },
  P: { x0: 330.8, y0: 322.7, x1: 347.3, y1: 334.7 },
};
export const KOTAK_PENGHASILAN: [Kotak, Kotak] = [
  K(1, { x0: 236.3, y0: 773.7, x1: 252.8, y1: 785.7 }),
  K(1, { x0: 254.8, y0: 773.7, x1: 271.3, y1: 785.7 }),
];
/** Kode jurusan sistem -> kotak. LPK3 memakai kotak jurusan kefarmasian pada template. */
export const KOTAK_JURUSAN: Record<string, Kotak> = {
  AKL: K(1, { x0: 236.3, y0: 808.7, x1: 252.8, y1: 820.7 }),
  MPLB: K(1, { x0: 236.3, y0: 826.7, x1: 252.8, y1: 838.7 }),
  LPK3: K(1, { x0: 236.3, y0: 844.7, x1: 252.8, y1: 856.7 }),
  TKR: K(1, { x0: 236.3, y0: 862.7, x1: 252.8, y1: 874.7 }),
};
export const KOTAK_SERAGAM: Record<string, Kotak> = {
  M: K(2, { x0: 261, y0: 517.5, x1: 277, y1: 531.5 }),
  L: K(2, { x0: 297, y0: 517.5, x1: 314, y1: 531.5 }),
  XL: K(2, { x0: 330, y0: 517.5, x1: 347, y1: 531.5 }),
  XXL: K(2, { x0: 369.5, y0: 517.5, x1: 386.5, y1: 531.5 }),
  XXXL: K(2, { x0: 415.5, y0: 517.5, x1: 432.5, y1: 531.5 }),
  Jumbo: K(2, { x0: 472.5, y0: 517.5, x1: 489.5, y1: 531.5 }),
};

/**
 * Nomor urut yang berubah setelah pita dipotong (template asli, atas-ke-bawah). Angka lama ditutup putih lalu
 * digambar ulang dengan Times New Roman 12 pt. `lebar` = lebar teks lama yang ditutup.
 */
export const NOMOR_BARU = [
  { h: 1 as Halaman, x: 56.6, y: 459.3, lebar: 12.1, teks: "11" },
  { h: 1 as Halaman, x: 56.6, y: 477.3, lebar: 12.1, teks: "12" },
  { h: 1 as Halaman, x: 56.6, y: 495.3, lebar: 12.1, teks: "13" },
  { h: 1 as Halaman, x: 56.6, y: 693.3, lebar: 12.1, teks: "14" },
  { h: 1 as Halaman, x: 56.6, y: 783.3, lebar: 12.1, teks: "15" },
  { h: 1 as Halaman, x: 55.6, y: 819.4, lebar: 12.1, teks: "16" },
  { h: 2 as Halaman, x: 75.4, y: 197.2, lebar: 8.4, teks: "b." },
].map((n) => ({ ...n, y: geserY(n.h, n.y) }));

/**
 * Judul halaman 1 "FORMULIR PENDAFTARAN MURID BARU" diganti (PRD 1.3 butir 78): teks lama (x 193,8 sampai 436,9,
 * garis dasar 134,3, Times tebal 12, diukur pdf.js) ditutup putih, teks baru digambar di titik tengah yang sama
 * dengan baris "SMK MA'ARIF NU 1 WANGON" di bawahnya.
 */
export const JUDUL_FORMULIR = { h: 1 as Halaman, x0: 193.8, x1: 436.9, y: 134.3, ukuran: 12, teks: "FORMULIR SISTEM PENERIMAAN MURID BARU" };

/** Tanda "/" bawaan template di antara titik nomor dan jurusan tanda terima (diukur pdf.js: x 308,2, lebar 3,6, garis dasar y). */
export const GARIS_MIRING_TT = [123.1, 558.9].map((y) => ({ x: 307.6, lebar: 4.8, y }));

/**
 * Teks tahun pelajaran yang tercetak 2026/2027 di template: ditutup kotak putih lalu digambar ulang
 * dengan huruf yang sama (Times New Roman tebal). Posisi x0..x1 dan garis dasar y dari PDF template.
 */
export const TAHUN_TEMPLATE = [
  { h: 1 as Halaman, x0: 353.59, x1: 409.27, y: 167.5, ukuran: 12.96, pemisah: "/" },
  { h: 3 as Halaman, x0: 467.86, x1: 534.7, y: 92.4, ukuran: 14.04, pemisah: " / " },
  { h: 3 as Halaman, x0: 467.86, x1: 534.7, y: 528.2, ukuran: 14.04, pemisah: " / " },
];
