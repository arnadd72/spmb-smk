// Skema Zod yang sama dengan server (PRD v4 6.4). Hanya modul validasi murni yang boleh diimpor dari klien.
export {
  NAMA_LANGKAH,
  TOTAL_LANGKAH,
  fieldBiasa,
  skemaLangkah,
  skemaNilaiUjian,
  skemaCekStatus,
  KUNCI_NILAI_UJIAN,
  type DefinisiField,
  type InputCekStatus,
  type OpsiField,
} from "@/server/validasi/wizard";
export type { JawabanMinat, SoalMinat } from "@/server/validasi/minat";
export { ANGKA_OCR, galatAngkaOcr, saringAngkaOcr } from "@/server/validasi/ocr";
export { aturanAngka, periksaAngka, saringAngka, type AturanAngka } from "@/server/validasi/angka";
