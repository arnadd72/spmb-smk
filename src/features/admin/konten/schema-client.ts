// Kategori folder foto web di Google Drive, sama dengan server (poin B). Modul murni, aman diimpor klien.
export { KATEGORI_MEDIA, type KategoriMedia } from "@/server/types/media";
// Batas isian jurusan dan pembuat pesan galatnya, sama dengan validasi server (modul murni tanpa Zod).
export { BATAS_JURUSAN, pecahBaris, periksaBatasDaftar, pesanKelebihan } from "@/server/validasi/batasJurusan";
