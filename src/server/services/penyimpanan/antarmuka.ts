import type { Readable } from "node:stream";

/**
 * Abstraksi penyimpanan berkas (PRD v4 7.3, 7.4). Semua akses ke Google Drive dan Supabase Storage
 * lewat antarmuka ini, agar layanan bisa diganti tanpa menyentuh kode pemanggil.
 *
 * `referensi` adalah penanda yang disimpan di database: file ID untuk Drive, path objek untuk bucket.
 */
export interface PenyimpananDokumen {
  /** Simpan berkas di `path` (mis. "2027-2028/SPMB-2027-0001 - AHMAD/akta.jpg"). Mengembalikan referensi. */
  simpan(path: string, isi: Buffer, mime?: string): Promise<string>;
  ambilStream(referensi: string): Promise<Readable>;
  hapus(referensi: string): Promise<void>;
  ada(referensi: string): Promise<boolean>;
  /** Ganti isi berkas yang sudah ada tanpa mengubah referensinya. `namaBaru` (opsional) mengganti nama berkas. */
  perbarui(referensi: string, isi: Buffer, mime?: string, namaBaru?: string): Promise<void>;
  /** Ganti nama folder yang memuat berkas `referensi`. Driver tanpa folder tidak berbuat apa-apa. */
  gantiNamaFolder(referensi: string, namaBaru: string): Promise<void>;
  /**
   * Hapus folder yang memuat berkas `referensi` beserta isinya, hanya bila namanya diawali `awalanNama` dan bukan folder akar.
   * Pengaman agar berkas yang salah rujuk tidak menyeret folder lain. Driver tanpa folder tidak berbuat apa-apa.
   */
  hapusFolderInduk(referensi: string, awalanNama: string): Promise<void>;
}

/** Pecah path jadi segmen folder dan nama berkas. Menolak traversal dan path kosong. */
export function pecahPath(path: string): { folder: string[]; nama: string } {
  const bagian = path.split("/").filter((b) => b !== "");
  if (bagian.length === 0 || bagian.some((b) => b === "." || b === "..")) {
    throw new Error("Path berkas tidak valid.");
  }
  const nama = bagian.pop() as string;
  return { folder: bagian, nama };
}
