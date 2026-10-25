// Foto web di Google Drive (poin B): kategori menentukan folder SPMB/situs/{kategori}/, dipakai server dan form admin.

export const KATEGORI_MEDIA = ["hero", "galeri", "berita", "agenda", "testimoni", "jurusan", "logo"] as const;
export type KategoriMedia = (typeof KATEGORI_MEDIA)[number];

/** Awalan nilai kolom gambar yang menunjuk berkas Drive publik: `/api/v1/media/{fileId}`. */
export const AWALAN_MEDIA = "/api/v1/media/";
