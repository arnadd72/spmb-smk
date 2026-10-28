// Soal dan hitungan tes minat bakat yang sama dengan server (PRD 1.3 butir 65). Modul murni, aman diimpor klien.
export { HURUF_MINAT, JURUSAN_MINAT, poinMinat, type JawabanMinat } from "@/server/validasi/minat";

/** Bagian soal yang dibutuhkan tampilan tes (id dan status hanya untuk panel admin). */
export type SoalTes = { teks: string; opsi: readonly string[] };
