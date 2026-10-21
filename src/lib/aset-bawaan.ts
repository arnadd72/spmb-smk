// Foto bawaan situs (berkas di public/images/sekolah) dan aturan memilih antara foto bawaan dan foto pilihan admin.
// Modul murni tanpa impor, dipakai server dan klien. Admin menggantinya dari halaman Galeri (PRD v4 butir 57).

export const ASET_BAWAAN = {
  logo: "/images/sekolah/logo-sekolah.png",
  hero: "/images/sekolah/gedung-siswa.webp",
} as const;

export const ALT_HERO_BAWAAN = "Siswi SMK Ma'arif NU 1 Wangon berfoto bersama di halaman depan gedung sekolah";
/** Dipakai bila admin mengganti foto hero: teks bawaan menjelaskan foto lama, bukan foto baru. */
export const ALT_HERO_UMUM = "Suasana SMK Ma'arif NU 1 Wangon";

export type FotoJurusan = { src: string; alt: string; posisi?: string };

// Foto: MPLB dan TKR dari situs sekolah, AKL dan LPK3 kiriman pihak sekolah.
export const FOTO_JURUSAN_BAWAAN: Record<string, FotoJurusan> = {
  AKL: { src: "/images/sekolah/praktik-akl.webp", alt: "Siswa AKL mengerjakan uji kompetensi akuntansi di laboratorium komputer" },
  MPLB: { src: "/images/sekolah/praktik-mplb.webp", alt: "Siswi MPLB berlatih layanan telepon di ruang praktik perkantoran" },
  // Foto 4:3 di bingkai hampir kotak: fokus ke siswi kiri yang meracik, dengan rak hijau di kanannya.
  LPK3: { src: "/images/sekolah/praktik-farmasi.webp", alt: "Siswa LPK3 meracik obat dengan mortir dan alu di laboratorium farmasi", posisi: "object-[0%_50%]" },
  // Foto lebar 2:1 di bingkai hampir kotak: fokus ke guru dan siswa yang memeriksa roda di kiri.
  TKR: { src: "/images/sekolah/praktik-tkr.webp", alt: "Siswa TKR memeriksa roda mobil di bengkel sekolah", posisi: "object-[18%_50%]" },
};

/**
 * Foto satu jurusan: pilihan admin (`Jurusan.gambar`) bila ada, selain itu foto bawaan. Foto pilihan admin tidak
 * memakai alt dan posisi potong foto bawaan, karena keduanya ditulis untuk foto yang lain.
 */
export function fotoJurusan(kode: string, nama: string, gambar: string | null | undefined): FotoJurusan | undefined {
  const bawaan = FOTO_JURUSAN_BAWAAN[kode];
  if (!gambar || gambar === bawaan?.src) return bawaan;
  return { src: gambar, alt: `Kegiatan praktik jurusan ${nama}` };
}

// Lima foto kehidupan sekolah di landing. Dipakai saat galeri di database belum punya foto aktif, dan bisa dimuat
// ke galeri admin lewat tombol "Muat foto bawaan situs" agar dapat diubah atau dihapus.
export const GALERI_BAWAAN: { src: string; alt: string; ket: string }[] = [
  {
    src: "/images/sekolah/p5-karya.webp",
    alt: "Siswa dan guru menunjukkan tempat sampah hasil karya kelas di halaman sekolah",
    ket: "Gelar karya: tempat sampah daur ulang buatan siswa kelas XI.",
  },
  {
    src: "/images/sekolah/istighotsah.webp",
    alt: "Siswa berkumpul untuk istighotsah di aula sekolah",
    ket: "Istighotsah bersama sebelum kunjungan industri.",
  },
  {
    src: "/images/sekolah/kelas-otkp.webp",
    alt: "Siswa makan bersama di kelas Otomatisasi dan Tata Kelola Perkantoran",
    ket: "Makan bergizi bersama di kelas perkantoran.",
  },
  {
    src: "/images/sekolah/p5-kostum.webp",
    alt: "Siswi memakai kostum dari bahan daur ulang pada Projek Penguatan Profil Pelajar Pancasila",
    ket: "Pawai karya Projek Penguatan Profil Pelajar Pancasila.",
  },
  {
    src: "/images/sekolah/kultum.webp",
    alt: "Siswa mendengarkan kultum di musala sekolah",
    ket: "Kultum bersama di musala.",
  },
];
