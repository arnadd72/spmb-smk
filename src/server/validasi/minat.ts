import { z } from "zod";

// Tes minat bakat (PRD 1.3 butir 65). Soalnya diatur admin di Isi Situs (butir 80, tabel SoalMinat, dimuat
// services/soalMinat.ts). Pilihan A sampai D tiap soal masing-masing mengarah ke satu jurusan (JURUSAN_MINAT, urutan
// sama). Modul murni: dipakai halaman Tes Minat Bakat publik, langkah 3 wizard (klien), dan server (validasi jawaban dan
// rekomendasi jurusan).

/** Kode jurusan untuk pilihan A, B, C, D. */
export const JURUSAN_MINAT = ["MPLB", "AKL", "LPK3", "TKR"] as const;
export const HURUF_MINAT = ["A", "B", "C", "D"] as const;
/** Penanda versi rekomendasi di `Pendaftar.rekomendasiVersi` (pendaftar lama: `bobot-*` dari nilai rapor). */
export const VERSI_MINAT = "minat-v1";

/** Satu soal tes: `opsi` berurutan A sampai D, sejajar JURUSAN_MINAT. Soal diatur admin (tabel SoalMinat). */
export type SoalMinat = { teks: string; opsi: string[] };
/** Batas soal aktif, juga batas panjang jawaban yang diterima server. */
export const BATAS_SOAL_MINAT = 60;

/**
 * Satu jawaban per soal aktif (urutan tampil): indeks pilihan (0 = A) atau null bila dilewati. Poin hanya bergantung
 * pada pilihan, bukan pada soalnya, jadi jawaban draf tetap terhitung benar walau admin mengubah soal di tengah jalan.
 */
export type JawabanMinat = (number | null)[];

/**
 * Jawaban untuk `jumlahSoal` soal aktif: dilengkapi null sampai sepanjang daftar soal. Kelebihan jawaban dibuang, tidak
 * ditolak, karena draf lama boleh lebih panjang bila admin mengurangi soal sebelum pendaftar mengirim.
 */
export const skemaJawabanMinat = (jumlahSoal: number) =>
  z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(JURUSAN_MINAT.length - 1)
        .nullable(),
      { error: "Jawaban tes tidak valid." },
    )
    .max(BATAS_SOAL_MINAT, "Jawaban tes tidak valid.")
    .transform((j): JawabanMinat => Array.from({ length: jumlahSoal }, (_, i) => j[i] ?? null));

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
