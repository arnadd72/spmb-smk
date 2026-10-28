import { z } from "zod";

// Tes minat bakat (PRD 1.3 butir 65, soal diatur admin sejak butir 80). Pilihan A sampai D tiap soal masing-masing mengarah ke satu
// jurusan (JURUSAN_MINAT, urutan sama). Modul murni: dipakai halaman Tes Minat Bakat publik, langkah 3 wizard (klien),
// dan server (validasi jawaban dan rekomendasi jurusan).

/** Kode jurusan untuk pilihan A, B, C, D. */
export const JURUSAN_MINAT = ["MPLB", "AKL", "LPK3", "TKR"] as const;
export const HURUF_MINAT = ["A", "B", "C", "D"] as const;
/** Penanda versi rekomendasi di `Pendaftar.rekomendasiVersi` (pendaftar lama: `bobot-*` dari nilai rapor). */
export const VERSI_MINAT = "minat-v1";

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
  /** Nomor tampil (1 = pertama). Kosong saat membuat = paling akhir, kosong saat mengubah = tidak dipindah. Soal lain bergeser. */
  posisi: z.coerce.number().int("Nomor harus bilangan bulat.").min(1, "Nomor minimal 1.").max(MAKS_SOAL_MINAT, `Nomor maksimal ${MAKS_SOAL_MINAT}.`).optional(),
  isActive: z.boolean().default(true),
});

export const skemaGeserSoalMinat = z.object({ arah: z.enum(["naik", "turun"], { error: "Arah geser tidak valid." }) });

/** Satu jawaban per soal: indeks pilihan (0 = A) atau null bila dilewati. Selalu sepanjang SOAL_MINAT. */
export type JawabanMinat = (number | null)[];

/**
 * Jawaban untuk `jumlah` soal aktif saat ini. Kelebihan elemen dibuang dan kekurangannya diisi null, sehingga admin yang
 * mengurangi soal tidak membuat draf lama gagal dikirim. Nilai di luar A-D tetap ditolak.
 */
export const skemaJawaban = (jumlah: number) =>
  z
    .array(z.number().int().min(0).max(JURUSAN_MINAT.length - 1).nullable(), { error: "Jawaban tes tidak valid." })
    .transform((j): JawabanMinat => Array.from({ length: jumlah }, (_, i) => j[i] ?? null));

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
