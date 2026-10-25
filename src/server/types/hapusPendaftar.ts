// Bentuk respons fitur hapus pendaftar. Tipe murni, dipakai server (aksi) dan halaman admin.

export type BarisHapus = { id: string; nomor: string; nama: string; tanggal: string; sumber: string };
export type HasilPratinjau = { total: number; ids: string[]; contoh: BarisHapus[] };
/** folderHilang: nomor pendaftar yang terhapus tetapi folder Drive-nya tidak bisa ditemukan (berkasnya sudah hilang dari Drive); periksa manual. */
export type HasilHapus = { terhapus: number; dilewati: number; gagal: { nomor: string; pesan: string }[]; folderHilang: string[] };
