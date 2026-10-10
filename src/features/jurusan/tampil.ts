// Warna dan foto per jurusan untuk halaman publik. Foto hanya ada untuk MPLB dan TKR (sumber: situs sekolah).
export const TAMPIL_JURUSAN: Record<string, { latar: string; teks: string; kode: string; foto?: { src: string; alt: string } }> = {
  AKL: { latar: "bg-kuning", teks: "text-ink", kode: "text-ink" },
  MPLB: {
    latar: "bg-mint",
    teks: "text-ink",
    kode: "text-ink",
    foto: { src: "/images/sekolah/praktik-mplb.webp", alt: "Siswi MPLB berlatih layanan telepon di ruang praktik perkantoran" },
  },
  FKK: { latar: "bg-primer", teks: "text-kertas", kode: "text-kertas" },
  TKR: {
    latar: "bg-ink",
    teks: "text-kertas",
    kode: "text-kuning",
    foto: { src: "/images/sekolah/praktik-tkr.webp", alt: "Siswa TKR memeriksa roda mobil di bengkel sekolah" },
  },
};

export const TAMPIL_STANDAR = { latar: "bg-permukaan-alt", teks: "text-ink", kode: "text-primer" };
