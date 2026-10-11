// Daftar menu panel admin (PRD v3.1 Bagian 13) dengan pembatasan per peran. Tampilan saja: hak akses
// sebenarnya diperiksa di server (wajibPeranHalaman dan wajibSesiAdmin).

export type PeranMenu = "superadmin" | "panitia" | "konten";

export type ItemMenu = {
  label: string;
  href: string;
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
    nama: "Utama",
    item: [
      { label: "Dashboard", href: "/admin", peran: SEMUA, siap: true },
      { label: "Data Peserta", href: "/admin/peserta", peran: PENDAFTAR, siap: true },
      { label: "Verifikasi", href: "/admin/verifikasi", peran: PENDAFTAR, siap: false },
    ],
  },
  {
    nama: "Aksi",
    item: [
      { label: "Kuota", href: "/admin/kuota", peran: PENDAFTAR, siap: false },
      { label: "Input Manual", href: "/admin/input-manual", peran: PENDAFTAR, siap: false },
      { label: "Ekspor XLSX", href: "/admin/ekspor", peran: PENDAFTAR, siap: false },
    ],
  },
  {
    nama: "Konten",
    item: [
      { label: "Berita", href: "/admin/berita", peran: KONTEN, siap: true },
      { label: "Agenda", href: "/admin/agenda", peran: KONTEN, siap: true },
      { label: "Galeri", href: "/admin/galeri", peran: KONTEN, siap: true },
      { label: "Testimoni", href: "/admin/testimoni", peran: KONTEN, siap: true },
      { label: "FAQ", href: "/admin/faq", peran: KONTEN, siap: true },
    ],
  },
  {
    nama: "Sistem",
    item: [
      { label: "Jurusan & Bobot", href: "/admin/jurusan-dan-bobot", peran: SISTEM, siap: true },
      { label: "Mata Pelajaran", href: "/admin/mata-pelajaran", peran: SISTEM, siap: false },
      { label: "Isian Formulir", href: "/admin/isian-formulir", peran: SISTEM, siap: false },
      { label: "Pengaturan", href: "/admin/pengaturan", peran: SISTEM, siap: true },
      { label: "Statistik OCR", href: "/admin/statistik-ocr", peran: SISTEM, siap: false },
      { label: "Akun Admin", href: "/admin/akun-admin", peran: SISTEM, siap: false },
      { label: "Audit Log", href: "/admin/audit-log", peran: SISTEM, siap: false },
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
