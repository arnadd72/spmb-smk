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
  opsi?: Opsi[] | { dinamis: "jurusan" };
};

const sama = (...n: string[]): Opsi[] => n.map((x) => ({ nilai: x, label: x }));

const PENDIDIKAN = sama("SD", "SMP", "SMA/SMK", "Diploma", "Sarjana", "Pascasarjana");
const PEKERJAAN_AYAH = sama("Petani", "Buruh", "Wiraswasta", "PNS", "TNI/Polri", "Guru", "Karyawan Swasta", "Lainnya");
const PEKERJAAN_IBU = sama("Ibu Rumah Tangga", "Petani", "Buruh", "Wiraswasta", "PNS", "Guru", "Karyawan Swasta", "Lainnya");
const AGAMA = sama("Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu");
const PENGHASILAN: Opsi[] = [
  { nilai: "01", label: "Kurang dari Rp 500.000" },
  { nilai: "02", label: "Rp 500.000 - Rp 999.999" },
  { nilai: "03", label: "Rp 1.000.000 - Rp 1.999.999" },
  { nilai: "04", label: "Rp 2.000.000 - Rp 4.999.999" },
  { nilai: "05", label: "Rp 5.000.000 atau lebih" },
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
  f(1, 10, "nama_lengkap", "Nama lengkap", "text", { teksBantuan: "Sesuai akta kelahiran." }),
  f(1, 20, "nisn", "NISN", "text", { teksBantuan: "10 digit angka." }),
  f(1, 25, "tanggal_lahir", "Tanggal lahir", "date"),
  f(1, 30, "setuju", "Saya menyetujui pengumpulan dan pemrosesan data pribadi sesuai ketentuan yang tertera", "checkbox", { terkunci: true }),

  // Langkah 2: akta dan KK
  f(2, 10, "akta", "Akta kelahiran", "file", opsional),
  f(2, 20, "kk", "Kartu keluarga", "file", opsional),

  // Langkah 3: rapor (terkunci selama rekomendasi aktif)
  f(3, 10, "rapor", "Rapor SMP/MTs", "file", { terkunci: true }),
  f(3, 20, "nilai_rapor", "Nilai rapor", "tabel", { terkunci: true }),

  // Langkah 4: pilihan jurusan
  f(4, 10, "jurusan_1", "Pilihan jurusan 1", "select", { opsi: { dinamis: "jurusan" } }),
  f(4, 20, "jurusan_2", "Pilihan jurusan 2", "select", { ...opsional, opsi: { dinamis: "jurusan" } }),

  // Langkah 5: data murid
  f(5, 20, "tempat_lahir", "Tempat lahir", "text"),
  f(5, 40, "nik", "NIK", "text", { teksBantuan: "16 digit angka." }),
  f(5, 41, "no_kk", "Nomor Kartu Keluarga", "text", { teksBantuan: "16 digit angka." }),
  f(5, 50, "jenis_kelamin", "Jenis kelamin", "radio", { opsi: [{ nilai: "L", label: "Laki-laki" }, { nilai: "P", label: "Perempuan" }] }),
  f(5, 60, "agama", "Agama", "select", { opsi: AGAMA }),
  f(5, 70, "anak_ke", "Anak ke", "number"),
  f(5, 71, "jumlah_saudara", "Jumlah saudara", "number"),
  f(5, 90, "asal_sekolah", "Asal sekolah", "text"),
  f(5, 100, "tamat_tahun", "Tahun tamat", "text"),
  f(5, 101, "no_ijazah", "Nomor ijazah", "text", opsional),
  f(5, 110, "no_hp", "Nomor HP", "tel"),
  f(5, 111, "no_wa", "Nomor WhatsApp", "tel", opsional),
  f(5, 120, "email", "Email", "email", opsional),
  f(5, 125, "alamat", "Alamat", "text", { teksBantuan: "Nama jalan atau dusun." }),
  f(5, 130, "rt", "RT", "text"),
  f(5, 131, "rw", "RW", "text"),
  f(5, 132, "desa", "Desa atau kelurahan", "text"),
  f(5, 133, "kecamatan", "Kecamatan", "text"),
  f(5, 134, "kabupaten", "Kabupaten atau kota", "text"),
  f(5, 135, "propinsi", "Provinsi", "text"),
  f(5, 140, "penghasilan", "Penghasilan orang tua per bulan", "radio", { opsi: PENGHASILAN }),
  f(5, 150, "referensi_pendaftar", "Mengetahui sekolah ini dari", "text", opsional),

  // Langkah 6: data orang tua
  f(6, 10, "nama_ayah", "Nama ayah", "text"),
  f(6, 11, "ayah_ttl", "Tempat dan tanggal lahir ayah", "text"),
  f(6, 12, "ayah_pendidikan", "Pendidikan terakhir ayah", "select", { opsi: PENDIDIKAN }),
  f(6, 13, "pekerjaan_ayah", "Pekerjaan ayah", "select", { opsi: PEKERJAAN_AYAH }),
  f(6, 20, "nama_ibu", "Nama ibu", "text"),
  f(6, 21, "ibu_ttl", "Tempat dan tanggal lahir ibu", "text"),
  f(6, 22, "ibu_pendidikan", "Pendidikan terakhir ibu", "select", { opsi: PENDIDIKAN }),
  f(6, 23, "pekerjaan_ibu", "Pekerjaan ibu", "select", { opsi: PEKERJAAN_IBU }),
  f(6, 25, "alamat_ortu", "Alamat orang tua", "text", { teksBantuan: "Nama jalan atau dusun." }),
  f(6, 30, "no_hp_ortu", "Nomor HP orang tua", "tel"),
  f(6, 31, "ortu_rt", "RT", "text"),
  f(6, 32, "ortu_rw", "RW", "text"),
  f(6, 33, "ortu_desa", "Desa atau kelurahan", "text"),
  f(6, 34, "ortu_kecamatan", "Kecamatan", "text"),
  f(6, 35, "ortu_kabupaten", "Kabupaten atau kota", "text"),
  f(6, 36, "ortu_propinsi", "Provinsi", "text"),

  // Langkah 7: Bagian B, C, D
  f(7, 1, "smp_kecamatan", "Kecamatan sekolah asal", "text"),
  f(7, 2, "smp_kabupaten", "Kabupaten atau kota sekolah asal", "text"),
  f(7, 3, "smp_propinsi", "Provinsi sekolah asal", "text"),
  f(7, 4, "ijazah_nomor_tahun", "Nomor dan tahun ijazah", "text", opsional),
  f(7, 5, "lama_belajar", "Lama belajar", "text"),
  f(7, 6, "nilai_ujian", "Nilai ujian", "tabel", { teksBantuan: "Bahasa Indonesia, Bahasa Inggris, Matematika, IPA." }),
  f(7, 10, "golongan_darah", "Golongan darah", "select", { opsi: sama("A", "B", "AB", "O", "Tidak Tahu") }),
  f(7, 11, "tinggi_badan", "Tinggi badan (cm)", "number"),
  f(7, 12, "berat_badan", "Berat badan (kg)", "number"),
  f(7, 13, "penyakit_pernah_diderita", "Penyakit yang pernah diderita", "textarea", opsional),
  f(7, 14, "hobi_olahraga", "Hobi olahraga", "text", opsional),
  f(7, 15, "hobi_kesenian", "Hobi kesenian", "text", opsional),
  f(7, 16, "hobi_organisasi", "Organisasi yang diikuti", "text", opsional),
  f(7, 17, "hobi_prestasi", "Prestasi", "text", opsional),
  f(7, 18, "hobi_lain", "Hobi lain", "text", opsional),
  f(7, 20, "ukuran_seragam", "Ukuran seragam", "select", { opsi: sama("M", "L", "XL", "XXL", "XXXL", "Jumbo") }),

  // Langkah 8: tinjau dan kirim
  f(8, 10, "konfirmasi_final", "Saya menyatakan data yang saya isi benar", "checkbox", { terkunci: true }),
];
