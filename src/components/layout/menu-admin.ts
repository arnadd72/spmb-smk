// Daftar menu panel admin (PRD v3.1 Bagian 13) dengan pembatasan per peran. Tampilan saja: hak akses
// sebenarnya diperiksa di server (wajibPeranHalaman dan wajibSesiAdmin).

export type PeranMenu = "superadmin" | "panitia" | "konten";

/** Kunci ikon; pemetaannya ke komponen ikon ada di admin-shell.tsx. */
export type IkonMenu =
  | "ringkasan"
  | "peserta"
  | "verifikasi"
  | "manual"
  | "ekspor"
  | "gelombang"
  | "kuota"
  | "berita"
  | "agenda"
  | "beranda"
  | "galeri"
  | "testimoni"
  | "faq"
  | "jurusan"
  | "mapel"
  | "formulir"
  | "pengaturan"
  | "ocr"
  | "akun"
  | "audit";

export type ItemMenu = {
  label: string;
  href: string;
  /** Satu baris penjelasan di bawah label, agar fungsi menu langsung jelas. */
  ket: string;
  ikon: IkonMenu;
  peran: PeranMenu[];
  /** false = halaman belum dibuat; item disembunyikan sampai siap. */
  siap: boolean;
};

const SEMUA: PeranMenu[] = ["superadmin", "panitia", "konten"];
const PENDAFTAR: PeranMenu[] = ["superadmin", "panitia"];
const KONTEN: PeranMenu[] = ["superadmin", "konten"];
const SISTEM: PeranMenu[] = ["superadmin"];

export const GRUP_MENU: { nama: string; item: ItemMenu[] }[] = [
  {
    // Satu item: tampil tanpa judul grup.
    nama: "Ringkasan",
    item: [{ label: "Dashboard", href: "/admin", ket: "Ringkasan pendaftaran", ikon: "ringkasan", peran: SEMUA, siap: true }],
  },
  {
    nama: "Pendaftar",
    item: [
      { label: "Data Peserta", href: "/admin/peserta", ket: "Daftar semua pendaftar", ikon: "peserta", peran: PENDAFTAR, siap: true },
      { label: "Input Manual", href: "/admin/input-manual", ket: "Daftarkan siswa yang datang langsung", ikon: "manual", peran: PENDAFTAR, siap: true },
      { label: "Ekspor Data", href: "/admin/ekspor", ket: "Unduh data ke Excel atau PDF", ikon: "ekspor", peran: PENDAFTAR, siap: true },
    ],
  },
  {
    nama: "Aturan Pendaftaran",
    item: [
      { label: "Gelombang", href: "/admin/gelombang", ket: "Jadwal buka dan tutup", ikon: "gelombang", peran: PENDAFTAR, siap: true },
      { label: "Kuota", href: "/admin/kuota", ket: "Daya tampung tiap jurusan", ikon: "kuota", peran: PENDAFTAR, siap: true },
    ],
  },
  {
    nama: "Isi Situs",
    item: [
      { label: "Berita", href: "/admin/berita", ket: "Tulis dan atur berita", ikon: "berita", peran: KONTEN, siap: true },
      { label: "Agenda", href: "/admin/agenda", ket: "Jadwal kegiatan sekolah", ikon: "agenda", peran: KONTEN, siap: true },
      { label: "Foto Beranda", href: "/admin/foto-beranda", ket: "Logo, foto utama, dan foto jurusan", ikon: "beranda", peran: KONTEN, siap: true },
      { label: "Galeri", href: "/admin/galeri", ket: "Foto kegiatan sekolah", ikon: "galeri", peran: KONTEN, siap: true },
      { label: "Testimoni", href: "/admin/testimoni", ket: "Kesan dari alumni", ikon: "testimoni", peran: KONTEN, siap: true },
      { label: "FAQ", href: "/admin/faq", ket: "Pertanyaan yang sering diajukan", ikon: "faq", peran: KONTEN, siap: true },
    ],
  },
  {
    nama: "Sistem",
    item: [
      { label: "Jurusan & Bobot", href: "/admin/jurusan-dan-bobot", ket: "Profil jurusan dan bobot nilai", ikon: "jurusan", peran: SISTEM, siap: true },
      { label: "Mata Pelajaran", href: "/admin/mata-pelajaran", ket: "Mapel untuk saran jurusan", ikon: "mapel", peran: SISTEM, siap: true },
      { label: "Isian Formulir", href: "/admin/isian-formulir", ket: "Atur kolom formulir pendaftaran", ikon: "formulir", peran: SISTEM, siap: true },
      { label: "Pengaturan", href: "/admin/pengaturan", ket: "Tahun ajaran dan pengaturan umum", ikon: "pengaturan", peran: SISTEM, siap: true },
      { label: "Statistik OCR", href: "/admin/statistik-ocr", ket: "Keberhasilan pembacaan dokumen", ikon: "ocr", peran: SISTEM, siap: true },
      { label: "Akun Admin", href: "/admin/akun-admin", ket: "Kelola akun panitia dan operator", ikon: "akun", peran: SISTEM, siap: true },
      { label: "Audit Log", href: "/admin/audit-log", ket: "Riwayat perubahan data", ikon: "audit", peran: SISTEM, siap: true },
    ],
  },
];

export const LABEL_PERAN: Record<PeranMenu, string> = {
  superadmin: "Superadmin",
  panitia: "Panitia",
  konten: "Operator konten",
};

/** Menu yang tampil untuk satu peran; grup kosong dibuang. */
export function menuUntuk(peran: PeranMenu) {
  return GRUP_MENU.map((g) => ({ ...g, item: g.item.filter((i) => i.siap && i.peran.includes(peran)) })).filter((g) => g.item.length > 0);
}

/** Cocokkan alamat sekarang dengan item menu ("/admin" hanya cocok persis, yang lain juga untuk anak halamannya). */
export const menuAktif = (path: string, href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));

/** Item dan grup untuk halaman yang sedang dibuka, atau null bila halaman tidak ada di menu (mis. Ganti password). */
export function lokasiSaatIni(peran: PeranMenu, path: string): { grup: string; item: ItemMenu } | null {
  for (const g of menuUntuk(peran)) {
    const item = g.item.find((i) => menuAktif(path, i.href));
    if (item) return { grup: g.nama, item };
  }
  return null;
}
