// Konfigurasi tampilan CRUD konten admin. Aturan validasi tetap di server (src/server/validasi/konten.ts).

export type TipeField = "teks" | "area" | "html" | "tanggalwaktu" | "angka" | "gambar" | "centang" | "daftarTeks";

export type DefField = {
  kunci: string;
  label: string;
  tipe: TipeField;
  wajib?: boolean;
  bantuan?: string;
  /** Nilai awal untuk data baru. */
  awal?: unknown;
};

export type DefKolom = { kunci: string; label: string; tipe?: "teks" | "tanggal" | "angka" | "status" | "gambar" | "potong" };

export type KonfigKonten = {
  /** Segmen API: /api/v1/admin/{api} */
  api: "berita" | "event" | "galeri" | "testimoni" | "faq";
  judul: string;
  tunggal: string;
  kolom: DefKolom[];
  field: DefField[];
  kosong: { judul: string; deskripsi: string };
};

const aktif: DefField = { kunci: "isActive", label: "Tampilkan di situs", tipe: "centang", awal: true };

export const KONFIG_KONTEN: Record<string, KonfigKonten> = {
  berita: {
    api: "berita",
    judul: "Berita",
    tunggal: "berita",
    kolom: [
      { kunci: "judul", label: "Judul" },
      { kunci: "isActive", label: "Status", tipe: "status" },
      { kunci: "publishedAt", label: "Terbit", tipe: "tanggal" },
    ],
    field: [
      { kunci: "judul", label: "Judul", tipe: "teks", wajib: true },
      { kunci: "isi", label: "Isi berita", tipe: "html", wajib: true, bantuan: "Boleh memakai HTML dasar: p, strong, em, ul, ol, li, h2, h3, a, img. Skrip dan gaya sebaris dibuang otomatis." },
      { kunci: "gambar", label: "Gambar sampul", tipe: "gambar", bantuan: "Unggah gambar (JPG, PNG, WebP, maks 5 MB) atau tempel alamat yang diawali / atau https://." },
      { kunci: "publishedAt", label: "Tanggal terbit", tipe: "tanggalwaktu", bantuan: "Kosong = terbit saat disimpan. Isi tanggal depan untuk menjadwalkan." },
      aktif,
    ],
    kosong: { judul: "Belum ada berita", deskripsi: "Tulis berita pertama agar tampil di halaman Berita." },
  },
  agenda: {
    api: "event",
    judul: "Agenda",
    tunggal: "agenda",
    kolom: [
      { kunci: "judul", label: "Kegiatan" },
      { kunci: "tanggal", label: "Tanggal", tipe: "tanggal" },
      { kunci: "lokasi", label: "Lokasi" },
      { kunci: "isActive", label: "Status", tipe: "status" },
    ],
    field: [
      { kunci: "judul", label: "Nama kegiatan", tipe: "teks", wajib: true },
      { kunci: "tanggal", label: "Tanggal dan waktu", tipe: "tanggalwaktu", wajib: true },
      { kunci: "lokasi", label: "Lokasi", tipe: "teks" },
      { kunci: "deskripsi", label: "Keterangan", tipe: "area" },
      { kunci: "gambar", label: "Gambar", tipe: "gambar" },
      aktif,
    ],
    kosong: { judul: "Belum ada agenda", deskripsi: "Tambahkan jadwal kegiatan sekolah." },
  },
  galeri: {
    api: "galeri",
    judul: "Galeri",
    tunggal: "foto",
    kolom: [
      { kunci: "gambar", label: "Foto", tipe: "gambar" },
      { kunci: "judul", label: "Keterangan" },
      { kunci: "urutan", label: "Urutan", tipe: "angka" },
      { kunci: "isActive", label: "Status", tipe: "status" },
    ],
    field: [
      { kunci: "gambar", label: "Foto", tipe: "gambar", wajib: true },
      { kunci: "judul", label: "Keterangan", tipe: "teks" },
      { kunci: "urutan", label: "Urutan", tipe: "angka", awal: 0, bantuan: "Angka kecil tampil lebih dulu." },
      aktif,
    ],
    kosong: { judul: "Galeri masih kosong", deskripsi: "Tambahkan foto kegiatan sekolah." },
  },
  testimoni: {
    api: "testimoni",
    judul: "Testimoni",
    tunggal: "testimoni",
    kolom: [
      { kunci: "nama", label: "Nama" },
      { kunci: "isi", label: "Isi", tipe: "potong" },
      { kunci: "urutan", label: "Urutan", tipe: "angka" },
      { kunci: "isActive", label: "Status", tipe: "status" },
    ],
    field: [
      { kunci: "nama", label: "Nama", tipe: "teks", wajib: true },
      { kunci: "keterangan", label: "Keterangan", tipe: "teks", bantuan: "Mis. alumni AKL 2022, bekerja di bank." },
      { kunci: "isi", label: "Isi testimoni", tipe: "area", wajib: true, bantuan: "Singkat saja, maksimal tiga baris di situs." },
      { kunci: "foto", label: "Foto", tipe: "gambar" },
      { kunci: "urutan", label: "Urutan", tipe: "angka", awal: 0 },
      aktif,
    ],
    kosong: { judul: "Belum ada testimoni", deskripsi: "Tambahkan testimoni alumni." },
  },
  faq: {
    api: "faq",
    judul: "FAQ",
    tunggal: "pertanyaan",
    kolom: [
      { kunci: "pertanyaan", label: "Pertanyaan" },
      { kunci: "kategori", label: "Kategori" },
      { kunci: "urutan", label: "Urutan", tipe: "angka" },
      { kunci: "isActive", label: "Status", tipe: "status" },
    ],
    field: [
      { kunci: "pertanyaan", label: "Pertanyaan", tipe: "teks", wajib: true },
      { kunci: "jawaban", label: "Jawaban", tipe: "area", wajib: true },
      { kunci: "keywords", label: "Kata kunci", tipe: "teks", bantuan: "Dipisah koma. Dipakai pencarian Tanya Panitia, mis. syarat, berkas, rapor." },
      { kunci: "kategori", label: "Kategori", tipe: "teks" },
      { kunci: "urutan", label: "Urutan", tipe: "angka", awal: 0 },
      aktif,
    ],
    kosong: { judul: "Belum ada pertanyaan", deskripsi: "Tambahkan pertanyaan yang sering ditanyakan calon murid." },
  },
};
