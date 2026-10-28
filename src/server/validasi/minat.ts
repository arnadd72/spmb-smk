import { z } from "zod";

// Tes minat bakat (PRD 1.3 butir 65): 15 soal dari sekolah. Pilihan A sampai D tiap soal masing-masing mengarah ke satu
// jurusan (JURUSAN_MINAT, urutan sama). Modul murni: dipakai halaman Tes Minat Bakat publik, langkah 3 wizard (klien),
// dan server (validasi jawaban dan rekomendasi jurusan).

/** Kode jurusan untuk pilihan A, B, C, D. */
export const JURUSAN_MINAT = ["MPLB", "AKL", "LPK3", "TKR"] as const;
export const HURUF_MINAT = ["A", "B", "C", "D"] as const;
/** Penanda versi rekomendasi di `Pendaftar.rekomendasiVersi` (pendaftar lama: `bobot-*` dari nilai rapor). */
export const VERSI_MINAT = "minat-v1";

export const SOAL_MINAT = [
  {
    teks: "Kegiatan apa yang paling kamu sukai ketika berada di sekolah?",
    opsi: [
      "Mengatur dokumen, membuat jadwal, dan membantu kegiatan sekolah.",
      "Menghitung uang, mencatat pemasukan, atau merencanakan kegiatan bisnis.",
      "Mempelajari kesehatan, obat-obatan, dan cara menjaga tubuh.",
      "Mengenal mesin, kendaraan, dan cara memperbaiki sesuatu.",
    ],
  },
  {
    teks: "Jika mendapat tugas kelompok, peran apa yang paling kamu sukai?",
    opsi: [
      "Mengatur pembagian tugas dan memastikan kegiatan berjalan teratur.",
      "Mengatur anggaran, menghitung keuntungan, atau merencanakan usaha kelompok.",
      "Mencari informasi tentang kesehatan dan obat-obatan.",
      "Menyiapkan peralatan dan membantu menyelesaikan masalah teknis.",
    ],
  },
  {
    teks: "Aktivitas mana yang paling menarik bagimu?",
    opsi: [
      "Menata dokumen, menyusun arsip, dan membuat jadwal kegiatan.",
      "Menghitung keuntungan penjualan, mencatat transaksi, atau merencanakan bisnis kecil.",
      "Mempelajari fungsi obat dan mengenal berbagai jenis bahan kesehatan.",
      "Mengamati mesin dan memahami cara kerjanya.",
    ],
  },
  {
    teks: "Ketika melihat seseorang mengalami kesulitan, apa yang paling mungkin kamu lakukan?",
    opsi: [
      "Membantu mengatur kebutuhan dan mencarikan informasi yang diperlukan.",
      "Membantu menghitung kebutuhan biaya atau menyusun anggaran.",
      "Membantu mencari informasi kesehatan yang tepercaya dan menyarankan bantuan tenaga kesehatan.",
      "Membantu memeriksa kerusakan benda atau mencari penyebab masalah teknis.",
    ],
  },
  {
    teks: "Pelajaran atau kegiatan seperti apa yang paling membuatmu penasaran?",
    opsi: [
      "Administrasi, komunikasi, dan pengelolaan kegiatan.",
      "Perhitungan, pengelolaan keuangan, dan strategi bisnis.",
      "IPA, tubuh manusia, dan obat-obatan.",
      "Mesin, otomotif, dan teknologi kendaraan.",
    ],
  },
  {
    teks: "Jika diberi tugas yang membutuhkan ketelitian, kamu lebih suka ...",
    opsi: [
      "Memeriksa kelengkapan dokumen dan memastikan susunannya rapi.",
      "Memeriksa angka, mencatat transaksi, dan memastikan perhitungan benar.",
      "Memeriksa informasi dan aturan penggunaan obat dengan cermat.",
      "Memeriksa komponen kendaraan dan memastikan setiap bagian terpasang dengan benar.",
    ],
  },
  {
    teks: "Kamu ingin memulai usaha kecil-kecilan. Apa yang paling ingin kamu lakukan?",
    opsi: [
      "Mengatur jadwal kegiatan dan menyusun dokumen usaha.",
      "Menentukan harga jual, menghitung modal dan keuntungan, serta merencanakan strategi penjualan.",
      "Mempelajari produk kesehatan dan memastikan informasi produknya benar.",
      "Memahami kebutuhan peralatan dan perawatan kendaraan untuk usaha bengkel.",
    ],
  },
  {
    teks: "Saat menghadapi masalah yang belum pernah kamu temui, apa yang biasanya kamu lakukan?",
    opsi: [
      "Menyusun langkah penyelesaian agar masalah lebih mudah diatur.",
      "Mengumpulkan data, menghitung kemungkinan, dan mempertimbangkan solusi bisnis atau keuangan.",
      "Mencari informasi tepercaya sebelum mengambil keputusan.",
      "Memeriksa penyebab masalah dan mencoba memahami cara kerjanya.",
    ],
  },
  {
    teks: "Lingkungan belajar seperti apa yang paling kamu sukai?",
    opsi: [
      "Ruang kerja yang rapi, terorganisasi, dan mendukung komunikasi.",
      "Tempat yang menyediakan kegiatan pencatatan keuangan, pengolahan data, atau simulasi bisnis.",
      "Laboratorium yang bersih dengan peralatan dan bahan untuk pembelajaran kefarmasian.",
      "Bengkel yang memiliki kendaraan, mesin, dan peralatan praktik.",
    ],
  },
  {
    teks: "Jika menemukan kesalahan dalam sebuah pekerjaan, apa yang paling mungkin kamu lakukan?",
    opsi: [
      "Memeriksa kembali urutan pekerjaan dan memperbaiki bagian yang tidak teratur.",
      "Menghitung ulang, memeriksa catatan transaksi, dan mencari penyebab kesalahan.",
      "Memeriksa kembali informasi dan prosedur untuk memastikan semuanya benar.",
      "Memeriksa bagian yang bermasalah dan mencari penyebab kerusakannya.",
    ],
  },
  {
    teks: "Keterampilan apa yang paling ingin kamu kuasai?",
    opsi: [
      "Berkomunikasi secara profesional, mengelola dokumen, dan mengatur pekerjaan.",
      "Membuat laporan keuangan, mencatat transaksi, menghitung keuntungan, dan mengelola bisnis.",
      "Mengenal obat-obatan dan memahami prosedur pelayanan kefarmasian.",
      "Merawat kendaraan dan memahami sistem mesin otomotif.",
    ],
  },
  {
    teks: "Jika sekolah mengadakan kunjungan belajar, tempat mana yang paling ingin kamu kunjungi?",
    opsi: [
      "Kantor perusahaan atau pusat administrasi.",
      "Perusahaan akuntansi, bagian keuangan perusahaan, atau tempat usaha yang mengelola bisnis.",
      "Apotek atau fasilitas pelayanan kefarmasian.",
      "Bengkel mobil atau pusat perawatan kendaraan.",
    ],
  },
  {
    teks: "Ketika mendapatkan banyak tugas dengan batas waktu yang berbeda, apa yang akan kamu lakukan?",
    opsi: [
      "Membuat jadwal dan daftar tugas berdasarkan prioritas.",
      "Menghitung anggaran atau waktu yang tersedia, memeriksa kebutuhan, dan menentukan prioritas.",
      "Memastikan tugas yang berhubungan dengan kesehatan dan keselamatan dikerjakan sesuai prosedur.",
      "Menentukan urutan pekerjaan berdasarkan masalah teknis yang harus diselesaikan.",
    ],
  },
  {
    teks: "Jika diminta membuat sebuah proyek sederhana, proyek apa yang paling menarik bagimu?",
    opsi: [
      "Membuat sistem pengarsipan atau jadwal kegiatan kelas.",
      "Membuat rencana bisnis sederhana beserta modal, harga jual, dan perkiraan keuntungan.",
      "Membuat media edukasi tentang penggunaan obat secara aman.",
      "Membuat proyek pengenalan komponen dan perawatan kendaraan.",
    ],
  },
  {
    teks: "Setelah lulus SMK, bidang pekerjaan apa yang paling ingin kamu coba?",
    opsi: [
      "Administrasi perkantoran, sekretaris, atau pengelolaan layanan kantor.",
      "Akuntansi, pembukuan, keuangan, administrasi bisnis, atau menjalankan usaha sendiri.",
      "Bidang kefarmasian sesuai kualifikasi dan ketentuan yang berlaku.",
      "Teknisi otomotif atau mekanik kendaraan ringan.",
    ],
  },
] as const;

/** Satu soal tes yang diatur admin (tabel SoalMinat, PRD 1.3 butir 80). `opsi` selalu empat teks, urutannya sama dengan JURUSAN_MINAT. */
export type SoalMinat = { id: string; urutan: number; teks: string; opsi: string[]; isActive: boolean };
export const MAKS_SOAL_MINAT = 50;

const teksMinat = (label: string, min: number, max: number) =>
  z.string({ error: `${label} wajib diisi.` }).trim().min(min, `${label} wajib diisi.`).max(max, `${label} maksimal ${max} karakter.`);

export const skemaSoalMinat = z.object({
  teks: teksMinat("Teks soal", 5, 300),
  opsi: z
    .array(teksMinat("Pilihan jawaban", 2, 300), { error: "Pilihan jawaban tidak valid." })
    .length(JURUSAN_MINAT.length, "Soal harus punya tepat 4 pilihan jawaban (A sampai D)."),
  /** Kosong saat membuat = ditaruh di urutan terakhir. */
  urutan: z.coerce.number().int("Urutan harus bilangan bulat.").min(0).max(10000).optional(),
  isActive: z.boolean().default(true),
});

export const skemaGeserSoalMinat = z.object({ arah: z.enum(["naik", "turun"], { error: "Arah geser tidak valid." }) });

/** Satu jawaban per soal: indeks pilihan (0 = A) atau null bila dilewati. Selalu sepanjang SOAL_MINAT. */
export type JawabanMinat = (number | null)[];

export const skemaJawabanMinat = z
  .array(
    z
      .number()
      .int()
      .min(0)
      .max(JURUSAN_MINAT.length - 1)
      .nullable(),
    { error: "Jawaban tes tidak valid." },
  )
  .max(SOAL_MINAT.length, "Jawaban tes tidak valid.")
  .transform((j): JawabanMinat => SOAL_MINAT.map((_, i) => j[i] ?? null));

export const jumlahTerjawab = (j: JawabanMinat | undefined) =>
  (j ?? []).filter((x) => x !== null).length;

/** Poin tiap jurusan = banyaknya jawaban yang mengarah ke jurusan itu. */
export function poinMinat(jawaban: JawabanMinat): Record<(typeof JURUSAN_MINAT)[number], number> {
  const poin = { MPLB: 0, AKL: 0, LPK3: 0, TKR: 0 };
  for (const x of jawaban) if (x !== null && JURUSAN_MINAT[x]) poin[JURUSAN_MINAT[x]] += 1;
  return poin;
}

export type LabelMinat = "Paling Sesuai" | "Juga Sesuai" | "Alternatif";
export type JurusanUntukMinat = { id: string; kode: string; nama: string; urutan: number };
export type HasilMinat = {
  jurusanId: string;
  kode: string;
  nama: string;
  poin: number;
  skor: number;
  label: LabelMinat;
  penjelasan: string;
};

/**
 * Peringkat jurusan aktif dari jawaban tes. Skor = persen jawaban yang mengarah ke jurusan itu. Poin tertinggi
 * (termasuk seri) = Paling Sesuai, poin lain di atas nol = Juga Sesuai. Tanpa jawaban: daftar kosong (tidak ada saran).
 */
export function peringkatMinat(
  jawaban: JawabanMinat | undefined,
  jurusan: JurusanUntukMinat[],
): HasilMinat[] {
  const terjawab = jumlahTerjawab(jawaban);
  if (!jawaban || terjawab === 0) return [];
  const poin: Record<string, number> = poinMinat(jawaban);
  const urut = jurusan
    .filter((j) => j.kode in poin)
    .map((j) => ({ j, poin: poin[j.kode] }))
    .sort((a, b) => b.poin - a.poin || a.j.urutan - b.j.urutan);
  const tertinggi = urut[0]?.poin ?? 0;
  return urut.map(({ j, poin: p }) => ({
    jurusanId: j.id,
    kode: j.kode,
    nama: j.nama,
    poin: p,
    skor: Math.round((p / terjawab) * 1000) / 10,
    label: p === tertinggi ? "Paling Sesuai" : p > 0 ? "Juga Sesuai" : "Alternatif",
    penjelasan:
      p === 0
        ? `Tidak ada jawabanmu yang mengarah ke ${j.kode}.`
        : `${p} dari ${terjawab} jawabanmu mengarah ke ${j.kode}.`,
  }));
}
