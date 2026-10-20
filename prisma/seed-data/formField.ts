// Field formulir bawaan per langkah wizard (PRD v3.1 Lampiran 23.3, opsi dari 23.5).
// Catatan: Lampiran 23.3 tidak mencantumkan `alamat` (langkah 5) dan `alamat_ortu` (langkah 6),
// padahal kolomnya ada di Lampiran 23.6. Keduanya ditambahkan di sini agar isian alamat lengkap.
// Wajib/opsional: yang bertanda "(opsional)" di lampiran opsional; selain itu wajib. Akta dan KK default
// opsional (keputusan S5 belum final, bisa diubah panitia di form builder).

type Opsi = { nilai: string; label: string };
export type FieldSeed = {
  kunci: string;
  langkah: number;
  label: string;
  tipe: "text" | "number" | "tel" | "email" | "date" | "textarea" | "select" | "radio" | "checkbox" | "file" | "tabel";
  urutan: number;
  wajib?: boolean;
  terkunci?: boolean;
  teksBantuan?: string;
  placeholder?: string;
  opsi?: Opsi[] | { dinamis: "jurusan" };
};

const sama = (...n: string[]): Opsi[] => n.map((x) => ({ nilai: x, label: x }));

const PENDIDIKAN = sama("SD", "SMP", "SMA/SMK", "Diploma", "Sarjana", "Pascasarjana");
const PEKERJAAN_AYAH = sama("Petani", "Buruh", "Wiraswasta", "PNS", "TNI/Polri", "Guru", "Karyawan Swasta", "Lainnya");
const PEKERJAAN_IBU = sama("Ibu Rumah Tangga", "Petani", "Buruh", "Wiraswasta", "PNS", "Guru", "Karyawan Swasta", "Lainnya");
const AGAMA = sama("Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu");
const PENGHASILAN: Opsi[] = [
  { nilai: "01", label: "Kurang dari Rp500.000" },
  { nilai: "02", label: "Rp500.000–999.999" },
  { nilai: "03", label: "Rp1.000.000–1.999.999" },
  { nilai: "04", label: "Rp2.000.000–4.999.999" },
  { nilai: "05", label: "Rp5.000.000 atau lebih" },
];

const f = (langkah: number, urutan: number, kunci: string, label: string, tipe: FieldSeed["tipe"], x: Partial<FieldSeed> = {}): FieldSeed => ({
  kunci,
  langkah,
  label,
  tipe,
  urutan,
  wajib: true,
  ...x,
});
const opsional = { wajib: false } as const;

export const FORM_FIELDS: FieldSeed[] = [
  // Langkah 1: persetujuan dan identitas awal
  f(1, 10, "nama_lengkap", "Nama lengkap", "text", { teksBantuan: "Tulis sesuai akta kelahiran, huruf kapital. Contoh: MUHAMMAD AFIF RAMADHAN.", placeholder: "MUHAMMAD AFIF RAMADHAN" }),
  f(1, 20, "nisn", "NISN", "text", { teksBantuan: "10 digit angka, tanpa spasi. Contoh: 0012345678.", placeholder: "0012345678" }),
  f(1, 25, "tanggal_lahir", "Tanggal lahir", "date", { teksBantuan: "Pilih dari kalender sesuai akta kelahiran (tanggal-bulan-tahun). Contoh: 15-07-2010. Tidak perlu diisi lagi di langkah berikutnya." }),
  f(1, 30, "setuju", "Saya menyetujui pengumpulan dan pemrosesan data pribadi sesuai ketentuan yang tertera", "checkbox", { terkunci: true }),

  // Langkah 2: akta dan KK
  f(2, 10, "akta", "Akta kelahiran", "file", opsional),
  f(2, 20, "kk", "Kartu keluarga", "file", opsional),
  f(2, 30, "pas_foto", "Pas foto 3 x 4", "file", {
    ...opsional,
    teksBantuan: "Foto tampak depan berlatar merah, memakai seragam sekolah asal, rapi, tanpa topi. Foto ini otomatis dicetak di formulir pendaftaran. Format JPG atau PNG.",
  }),

  // Langkah 3: nilai rapor (terkunci selama rekomendasi aktif). Foto rapor tidak diunggah, hanya nilainya.
  f(3, 20, "nilai_rapor", "Nilai rapor", "tabel", { ...opsional, terkunci: true }),

  // Langkah 4: pilihan jurusan
  f(4, 10, "jurusan_1", "Pilihan jurusan", "select", { opsi: { dinamis: "jurusan" } }),

  // Langkah 5: data murid
  f(5, 20, "tempat_lahir", "Tempat lahir", "text", { teksBantuan: "Tulis nama kota atau kabupaten tempat lahir, sesuai akta. Contoh: BANYUMAS. Tanggal lahir diisi terpisah.", placeholder: "BANYUMAS" }),
  f(5, 40, "nik", "NIK", "text", { teksBantuan: "16 digit angka sesuai Kartu Keluarga. Contoh: 3302010507100001.", placeholder: "3302010507100001" }),
  f(5, 41, "no_kk", "Nomor Kartu Keluarga", "text", { teksBantuan: "16 digit angka, ada di bagian atas Kartu Keluarga. Contoh: 3302010101100001.", placeholder: "3302010101100001" }),
  f(5, 50, "jenis_kelamin", "Jenis kelamin", "radio", { opsi: [{ nilai: "L", label: "Laki-laki" }, { nilai: "P", label: "Perempuan" }] }),
  f(5, 60, "agama", "Agama", "select", { opsi: AGAMA }),
  f(5, 70, "anak_ke", "Anak ke", "number", { teksBantuan: "Angka saja. Contoh: 2." }),
  f(5, 71, "jumlah_saudara", "Jumlah saudara", "number", { teksBantuan: "Jumlah saudara kandung, angka saja. Contoh: 3." }),
  f(5, 100, "tamat_tahun", "Tahun tamat", "text", { teksBantuan: "4 digit tahun lulus. Contoh: 2026.", placeholder: "2026" }),
  f(5, 110, "no_hp", "Nomor HP", "tel", { teksBantuan: "Nomor yang aktif, angka saja. Contoh: 081234567890.", placeholder: "081234567890" }),
  f(5, 111, "no_wa", "Nomor WhatsApp", "tel", { ...opsional, teksBantuan: "Boleh dikosongkan bila sama dengan nomor HP. Contoh: 081234567890." }),
  f(5, 120, "email", "Email", "email", { ...opsional, teksBantuan: "Untuk menerima kode pendaftaran. Contoh: nama@gmail.com." }),
  f(5, 125, "alamat", "Alamat", "text", { teksBantuan: "Nama jalan atau dusun, tanpa RT/RW dan desa. Contoh: DUSUN KRAJAN.", placeholder: "DUSUN KRAJAN" }),
  f(5, 130, "rt", "RT", "text", { teksBantuan: "Contoh: 003.", placeholder: "003" }),
  f(5, 131, "rw", "RW", "text", { teksBantuan: "Contoh: 005.", placeholder: "005" }),
  f(5, 132, "desa", "Desa atau kelurahan", "text", { teksBantuan: "Contoh: WANGON.", placeholder: "WANGON" }),
  f(5, 133, "kecamatan", "Kecamatan", "text", { teksBantuan: "Contoh: WANGON.", placeholder: "WANGON" }),
  f(5, 134, "kabupaten", "Kabupaten atau kota", "text", { teksBantuan: "Contoh: BANYUMAS.", placeholder: "BANYUMAS" }),
  f(5, 135, "propinsi", "Provinsi", "text", { teksBantuan: "Contoh: JAWA TENGAH.", placeholder: "JAWA TENGAH" }),
  f(5, 140, "penghasilan", "Penghasilan orang tua per bulan", "radio", { opsi: PENGHASILAN }),
  f(5, 150, "referensi_pendaftar", "Mengetahui sekolah ini dari", "text", {
    teksBantuan: "Pilih sumber yang tersedia atau pilih Lainnya lalu tulis sendiri.",
    opsi: sama("Teman/saudara/keluarga", "Sosmed", "Alumni", "Sosialisasi SPMB", "Lainnya (tulis sendiri)"),
  }),

  // Langkah 6: data orang tua
  f(6, 10, "nama_ayah", "Nama ayah", "text", { teksBantuan: "Nama lengkap sesuai KTP atau Kartu Keluarga. Contoh: SUPARMAN.", placeholder: "SUPARMAN" }),
  f(6, 11, "ayah_tempat_lahir", "Tempat lahir ayah", "text", { teksBantuan: "Nama kota atau kabupaten, ditulis sama seperti tempat lahir murid. Contoh: BANYUMAS.", placeholder: "BANYUMAS" }),
  f(6, 12, "ayah_tanggal_lahir", "Tanggal lahir ayah", "date", { teksBantuan: "Pilih dari kalender (tanggal-bulan-tahun). Contoh: 20-03-1980." }),
  f(6, 13, "ayah_pendidikan", "Pendidikan terakhir ayah", "select", { opsi: PENDIDIKAN }),
  f(6, 14, "pekerjaan_ayah", "Pekerjaan ayah", "select", { opsi: PEKERJAAN_AYAH }),
  f(6, 15, "nik_ayah", "NIK ayah", "text", { teksBantuan: "16 digit angka sesuai KTP. Contoh: 3302012003800001.", placeholder: "3302012003800001" }),
  f(6, 20, "nama_ibu", "Nama ibu", "text", { teksBantuan: "Nama lengkap sesuai KTP atau Kartu Keluarga. Contoh: SITI AMINAH.", placeholder: "SITI AMINAH" }),
  f(6, 21, "ibu_tempat_lahir", "Tempat lahir ibu", "text", { teksBantuan: "Nama kota atau kabupaten, ditulis sama seperti tempat lahir murid. Contoh: BANYUMAS.", placeholder: "BANYUMAS" }),
  f(6, 22, "ibu_tanggal_lahir", "Tanggal lahir ibu", "date", { teksBantuan: "Pilih dari kalender (tanggal-bulan-tahun). Contoh: 12-08-1982." }),
  f(6, 23, "ibu_pendidikan", "Pendidikan terakhir ibu", "select", { opsi: PENDIDIKAN }),
  f(6, 24, "pekerjaan_ibu", "Pekerjaan ibu", "select", { opsi: PEKERJAAN_IBU }),
  f(6, 25, "nik_ibu", "NIK ibu", "text", { teksBantuan: "16 digit angka sesuai KTP. Contoh: 3302011208820001.", placeholder: "3302011208820001" }),
  f(6, 26, "alamat_ortu", "Alamat orang tua", "text", { teksBantuan: "Nama jalan atau dusun, tanpa RT/RW dan desa. Contoh: DUSUN KRAJAN.", placeholder: "DUSUN KRAJAN" }),
  f(6, 30, "no_hp_ortu", "Nomor HP orang tua", "tel", { teksBantuan: "Angka saja. Contoh: 081234567890.", placeholder: "081234567890" }),
  f(6, 31, "ortu_rt", "RT", "text"),
  f(6, 32, "ortu_rw", "RW", "text"),
  f(6, 33, "ortu_desa", "Desa atau kelurahan", "text"),
  f(6, 34, "ortu_kecamatan", "Kecamatan", "text"),
  f(6, 35, "ortu_kabupaten", "Kabupaten atau kota", "text"),
  f(6, 36, "ortu_propinsi", "Provinsi", "text"),

  // Langkah 7: Bagian B, C, D
  f(7, 0, "asal_sekolah", "Nama sekolah asal", "text", { teksBantuan: "Tulis nama lengkap SMP atau MTs. Contoh: SMP NEGERI 1 WANGON.", placeholder: "SMP NEGERI 1 WANGON" }),
  f(7, 1, "smp_kecamatan", "Kecamatan sekolah asal", "text", { teksBantuan: "Contoh: WANGON.", placeholder: "WANGON" }),
  f(7, 2, "smp_kabupaten", "Kabupaten atau kota sekolah asal", "text", { teksBantuan: "Contoh: BANYUMAS.", placeholder: "BANYUMAS" }),
  f(7, 3, "smp_propinsi", "Provinsi sekolah asal", "text", { teksBantuan: "Contoh: JAWA TENGAH.", placeholder: "JAWA TENGAH" }),
  f(7, 5, "lama_belajar", "Lama belajar", "text", { teksBantuan: "Contoh: 3 tahun.", placeholder: "3 tahun" }),
  f(7, 10, "golongan_darah", "Golongan darah", "select", { opsi: sama("A", "B", "AB", "O", "Tidak Tahu") }),
  f(7, 11, "tinggi_badan", "Tinggi badan", "number", { teksBantuan: "Angka saja, tidak perlu menulis satuan. Contoh: 165." }),
  f(7, 12, "berat_badan", "Berat badan", "number", { teksBantuan: "Angka saja, tidak perlu menulis satuan. Contoh: 52." }),
  f(7, 13, "penyakit_pernah_diderita", "Penyakit yang pernah diderita", "textarea", { ...opsional, teksBantuan: "Kosongkan bila tidak ada. Contoh: ASMA." }),
  f(7, 14, "hobi_olahraga", "Hobi olahraga", "text", { ...opsional, teksBantuan: "Contoh: SEPAK BOLA." }),
  f(7, 15, "hobi_kesenian", "Hobi kesenian", "text", { ...opsional, teksBantuan: "Contoh: HADRAH." }),
  f(7, 16, "hobi_organisasi", "Organisasi yang diikuti", "text", { ...opsional, teksBantuan: "Contoh: OSIS, PRAMUKA." }),
  f(7, 17, "hobi_prestasi", "Prestasi", "text", { ...opsional, teksBantuan: "Contoh: JUARA 2 LOMBA PIDATO TINGKAT KECAMATAN." }),
  f(7, 18, "hobi_lain", "Hobi lain", "text", { ...opsional, teksBantuan: "Contoh: MEMBACA." }),
  f(7, 20, "ukuran_seragam", "Ukuran seragam", "select", { opsi: sama("M", "L", "XL", "XXL", "XXXL", "Jumbo") }),

  // Langkah 8: tinjau dan kirim
  f(8, 10, "konfirmasi_final", "Saya menyatakan data yang saya isi benar", "checkbox", { terkunci: true }),
];
