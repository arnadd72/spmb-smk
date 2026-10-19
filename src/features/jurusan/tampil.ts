// Warna dan foto per jurusan untuk halaman publik. Foto: MPLB dan TKR dari situs sekolah, AKL dan LPK3 kiriman pihak sekolah.
export const TAMPIL_JURUSAN: Record<string, { latar: string; teks: string; kode: string; foto?: { src: string; alt: string; posisi?: string } }> = {
  AKL: {
    latar: "bg-primer",
    teks: "text-kertas",
    kode: "text-kunyit",
    foto: { src: "/images/sekolah/praktik-akl.webp", alt: "Siswa AKL mengerjakan uji kompetensi akuntansi di laboratorium komputer" },
  },
  MPLB: {
    latar: "bg-mint",
    teks: "text-ink",
    kode: "text-ink",
    foto: { src: "/images/sekolah/praktik-mplb.webp", alt: "Siswi MPLB berlatih layanan telepon di ruang praktik perkantoran" },
  },
  LPK3: {
    latar: "bg-jurusan-lpk3",
    teks: "text-kertas",
    kode: "text-kertas",
    // Foto 4:3 di bingkai hampir kotak: fokus ke siswi kiri yang meracik, dengan rak hijau di kanannya.
    foto: { src: "/images/sekolah/praktik-farmasi.webp", alt: "Siswa LPK3 meracik obat dengan mortir dan alu di laboratorium farmasi", posisi: "object-[0%_50%]" },
  },
  TKR: {
    latar: "bg-jurusan-tkr",
    teks: "text-kertas",
    kode: "text-kertas",
    // Foto lebar 2:1 di bingkai hampir kotak: fokus ke guru dan siswa yang memeriksa roda di kiri.
    foto: { src: "/images/sekolah/praktik-tkr.webp", alt: "Siswa TKR memeriksa roda mobil di bengkel sekolah", posisi: "object-[18%_50%]" },
  },
};

export const TAMPIL_STANDAR = { latar: "bg-permukaan-alt", teks: "text-ink", kode: "text-primer" };
