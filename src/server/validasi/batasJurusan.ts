// Batas isian jurusan dan pesan galat yang menyebut bagian dan barisnya. Modul murni (tanpa Zod): dipakai server untuk
// validasi otoritatif dan form admin untuk galat langsung saat mengetik, supaya angka dan kalimatnya selalu sama.

export const BATAS_JURUSAN = {
  deskripsi: 5000,
  prospekBaris: 20,
  prospekPanjang: 160,
  keunggulanBaris: 150,
  keunggulanPanjang: 1500,
} as const;

export type GalatBatas = {
  /** Indeks butir (mulai 0) yang melebihi batas; null bila galatnya soal jumlah baris. */
  baris: number | null;
  pesan: string;
};

/** Pecah teks per baris seperti validasi server: tiap baris dirapikan, baris kosong dibuang. */
export function pecahBaris(teks: string): string[] {
  return teks
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);
}

/** Pesan bila teks melebihi batas karakter; null bila masih muat. */
export function pesanKelebihan(label: string, panjang: number, maks: number): string | null {
  if (panjang <= maks) return null;
  return `${label} terlalu panjang: ${panjang} karakter, maksimal ${maks} (kelebihan ${panjang - maks} karakter).`;
}

/** Periksa daftar baris: tiap baris yang kepanjangan disebut nomor dan awal barisnya, lalu jumlah baris keseluruhan. */
export function periksaBatasDaftar(baris: readonly string[], maksPanjang: number, maksBaris: number): GalatBatas[] {
  const hasil: GalatBatas[] = [];
  baris.forEach((b, i) => {
    if (b.length <= maksPanjang) return;
    const awal = b.length > 30 ? `${b.slice(0, 30)}…` : b;
    hasil.push({
      baris: i,
      pesan: `Baris ke-${i + 1} ("${awal}") terlalu panjang: ${b.length} karakter, maksimal ${maksPanjang} (kelebihan ${b.length - maksPanjang}).`,
    });
  });
  if (baris.length > maksBaris) {
    hasil.push({ baris: null, pesan: `Terlalu banyak baris: ${baris.length}, maksimal ${maksBaris}. Hapus ${baris.length - maksBaris} baris.` });
  }
  return hasil;
}
