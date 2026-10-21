// Bentuk data foto situs untuk halaman admin Galeri (PRD v4 butir 57). Tipe murni, boleh diimpor klien.

export type BarisAset = {
  kunci: string;
  kelompok: "umum" | "jurusan";
  label: string;
  bantuan: string;
  /** Foto yang tampil di situs saat ini; null bila belum ada (jurusan baru tanpa foto). */
  url: string | null;
  bawaan: string | null;
  /** Foto sudah diganti admin (berbeda dari bawaan). */
  diganti: boolean;
};

export type DaftarAset = { data: BarisAset[]; galeri: number };
