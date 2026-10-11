// Skema Zod yang sama dengan server (PRD v4 6.4). Hanya modul validasi murni yang boleh diimpor dari klien.
export {
  NAMA_LANGKAH,
  TOTAL_LANGKAH,
  fieldBiasa,
  rataMapel,
  skemaLangkah,
  skemaNilaiRapor,
  skemaNilaiUjian,
  skemaCekStatus,
  KUNCI_NILAI_UJIAN,
  type DefinisiField,
  type InputCekStatus,
  type NilaiRapor,
  type OpsiField,
} from "@/server/validasi/wizard";
