// Warna per jurusan untuk halaman publik. Foto jurusan ada di src/lib/aset-bawaan.ts (bawaan) dan dapat diganti admin dari halaman Galeri.
export const TAMPIL_JURUSAN: Record<string, { latar: string; teks: string; kode: string }> = {
  AKL: { latar: "bg-primer", teks: "text-kertas", kode: "text-kunyit" },
  MPLB: { latar: "bg-kunyit", teks: "text-ink", kode: "text-ink" },
  LPK3: { latar: "bg-jurusan-lpk3", teks: "text-kertas", kode: "text-kertas" },
  TKR: { latar: "bg-jurusan-tkr", teks: "text-kertas", kode: "text-kertas" },
};

export const TAMPIL_STANDAR = { latar: "bg-permukaan-alt", teks: "text-ink", kode: "text-primer" };
