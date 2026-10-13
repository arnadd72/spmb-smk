// Tipe bersama OCR sisi klien (PRD v4 Bagian 11). Parser hanya mengenal baris teks + kotak + skor,
// bukan mesinnya, sehingga mesin bisa diganti tanpa menyentuh parser.

/** Satu potongan teks hasil baca. Kotak: [x1, y1, x2, y2] dalam piksel gambar yang diproses. */
export type BarisOcr = { teks: string; kotak: [number, number, number, number]; skor: number };

export type Keyakinan = "HIGH" | "MEDIUM" | "LOW" | "NOT_FOUND";

/** Nilai kosong berarti tidak diisi otomatis (LOW dan NOT_FOUND tidak pernah menebak). */
export type FieldOcr = { nilai: string; keyakinan: Keyakinan };

export type HasilParser = Record<string, FieldOcr>;

export type JenisOcr = "akta" | "kk" | "rapor";

export type MapelRef = { kode: string; nama: string; alias: string[] };
