// Data referensi dari PRD v3.1 Lampiran 23.1 (jurusan), 23.2 (mata pelajaran), dan Bagian 12.3 (bobot).
// Teks keunggulan dan bobot adalah usulan awal: final dari sekolah dan guru BK (keputusan S4).

export const JURUSAN = [
  {
    kode: "AKL",
    nama: "Akuntansi dan Keuangan Lembaga",
    deskripsi: "Akuntansi, pembukuan, perpajakan, perbankan, dan pengelolaan keuangan lembaga.",
    prospekKarir: ["Staf Akuntansi", "Kasir Bank", "Staf Pajak", "Wirausaha"],
    keunggulan: ["Praktik aplikasi akuntansi", "Kunjungan industri perbankan"],
    kuota: 72,
    urutan: 1,
  },
  {
    kode: "MPLB",
    nama: "Manajemen Perkantoran dan Layanan Bisnis",
    deskripsi: "Manajemen perkantoran modern, layanan bisnis, komunikasi profesional, dan administrasi.",
    prospekKarir: ["Sekretaris", "Admin Perkantoran", "Customer Service", "Resepsionis"],
    keunggulan: ["Praktik kantor", "Kearsipan digital"],
    kuota: 72,
    urutan: 2,
  },
  {
    kode: "FKK",
    nama: "Farmasi Klinis dan Komunitas",
    deskripsi: "Ilmu farmasi, pengelolaan obat, dan pelayanan kesehatan di apotek, klinik, dan rumah sakit.",
    prospekKarir: ["Asisten Tenaga Kefarmasian", "Staf Apotek atau Klinik", "Wirausaha Apotek"],
    keunggulan: ["Laboratorium farmasi"],
    kuota: 72,
    urutan: 3,
  },
  {
    kode: "TKR",
    nama: "Teknik Kendaraan Ringan",
    deskripsi: "Perawatan dan perbaikan kendaraan ringan, sistem mesin, dan kelistrikan.",
    prospekKarir: ["Mekanik", "Teknisi", "Staf Bengkel Resmi", "Wirausaha Bengkel"],
    keunggulan: ["Bengkel praktik"],
    kuota: 108,
    urutan: 4,
  },
] as const;

type Mapel = { kode: string; nama: string; alias: string[]; kelompok: "umum" | "madrasah" | "mulok" };

export const MAPEL: Mapel[] = [
  { kode: "pai", nama: "Pendidikan Agama Islam dan Budi Pekerti", alias: ["pendidikan agama islam", "pai", "pendidikan agama", "agama"], kelompok: "umum" },
  { kode: "ppkn", nama: "Pendidikan Pancasila", alias: ["pendidikan pancasila", "pendidikan pancasila dan kewarganegaraan", "ppkn", "pkn"], kelompok: "umum" },
  { kode: "b_indonesia", nama: "Bahasa Indonesia", alias: ["bahasa indonesia", "b. indonesia", "b indonesia"], kelompok: "umum" },
  { kode: "matematika", nama: "Matematika", alias: ["matematika", "mtk"], kelompok: "umum" },
  { kode: "ipa", nama: "Ilmu Pengetahuan Alam", alias: ["ilmu pengetahuan alam", "ipa"], kelompok: "umum" },
  { kode: "ips", nama: "Ilmu Pengetahuan Sosial", alias: ["ilmu pengetahuan sosial", "ips"], kelompok: "umum" },
  { kode: "b_inggris", nama: "Bahasa Inggris", alias: ["bahasa inggris", "b. inggris"], kelompok: "umum" },
  { kode: "pjok", nama: "PJOK", alias: ["pendidikan jasmani olahraga dan kesehatan", "pjok", "penjasorkes"], kelompok: "umum" },
  { kode: "informatika", nama: "Informatika", alias: ["informatika", "tik"], kelompok: "umum" },
  { kode: "seni", nama: "Seni Budaya", alias: ["seni budaya", "seni musik", "seni rupa", "seni tari", "seni teater"], kelompok: "umum" },
  { kode: "prakarya", nama: "Prakarya", alias: ["prakarya", "seni dan prakarya", "prakarya dan kewirausahaan"], kelompok: "umum" },
  { kode: "b_jawa", nama: "Bahasa Jawa", alias: ["bahasa jawa", "basa jawa", "b. jawa"], kelompok: "mulok" },
  { kode: "quran_hadis", nama: "Al-Qur'an Hadis", alias: ["al-qur'an hadis", "quran hadits"], kelompok: "madrasah" },
  { kode: "akidah_akhlak", nama: "Akidah Akhlak", alias: ["akidah akhlak", "aqidah akhlak"], kelompok: "madrasah" },
  { kode: "fikih", nama: "Fikih", alias: ["fikih", "fiqih", "fiqh"], kelompok: "madrasah" },
  { kode: "ski", nama: "Sejarah Kebudayaan Islam", alias: ["sejarah kebudayaan islam", "ski"], kelompok: "madrasah" },
  { kode: "b_arab", nama: "Bahasa Arab", alias: ["bahasa arab"], kelompok: "madrasah" },
];

/** Bobot default per jurusan (PRD v3.1 12.3). Total per jurusan 1,00. */
export const BOBOT: Record<string, Record<string, number>> = {
  AKL: { matematika: 0.4, ips: 0.25, b_indonesia: 0.15, informatika: 0.1, b_inggris: 0.1 },
  MPLB: { b_indonesia: 0.3, ips: 0.25, b_inggris: 0.2, informatika: 0.15, matematika: 0.1 },
  FKK: { ipa: 0.45, matematika: 0.2, b_indonesia: 0.15, b_inggris: 0.1, pai: 0.1 },
  TKR: { ipa: 0.35, matematika: 0.3, prakarya: 0.2, informatika: 0.15 },
};

export const FAQ = [
  {
    pertanyaan: "Apakah saya perlu membuat akun untuk mendaftar?",
    jawaban: "Tidak perlu. Pendaftaran dilakukan tanpa akun. Setelah mengirim formulir, Anda mendapat nomor pendaftaran dan tautan halaman sukses. Simpan keduanya.",
    keywords: ["akun", "login", "daftar", "registrasi", "masuk"],
    kategori: "Pendaftaran",
  },
  {
    pertanyaan: "Dokumen apa yang harus disiapkan?",
    jawaban: "Siapkan foto atau pindaian Akta Kelahiran dan Kartu Keluarga untuk diunggah, serta rapor SMP/MTs untuk dibaca nilainya (foto rapor tidak disimpan). Pada saat verifikasi, bawa berkas fisik sesuai daftar di halaman sukses.",
    keywords: ["dokumen", "berkas", "persyaratan", "syarat", "akta", "kk", "rapor", "upload"],
    kategori: "Persyaratan",
  },
  {
    pertanyaan: "Bagaimana cara mengunggah rapor?",
    jawaban: "Pada Langkah 3, Anda bisa memotret halaman rapor agar nilainya dibaca otomatis di HP Anda, atau mengisi tabel nilai sendiri. Foto rapor tidak diunggah dan tidak disimpan. Periksa dan perbaiki tabel nilainya sebelum lanjut.",
    keywords: ["rapor", "nilai", "upload", "unggah", "foto", "pdf"],
    kategori: "Cara Upload",
  },
  {
    pertanyaan: "Bagaimana rekomendasi jurusan dihitung?",
    jawaban: "Rekomendasi dihitung dari nilai rapor yang Anda konfirmasi, memakai bobot mata pelajaran untuk tiap jurusan. Hasilnya hanya saran. Anda bebas memilih jurusan sendiri.",
    keywords: ["rekomendasi", "jurusan", "nilai", "bobot", "saran", "pilihan"],
    kategori: "Rekomendasi",
  },
  {
    pertanyaan: "Bagaimana cara mengecek status pendaftaran?",
    jawaban: "Buka halaman Cek Status, lalu isi nomor pendaftaran dan tanggal lahir sesuai yang Anda daftarkan.",
    keywords: ["status", "cek", "hasil", "nomor", "pendaftaran", "diterima"],
    kategori: "Status",
  },
  {
    pertanyaan: "Saya kehilangan nomor pendaftaran. Apa yang harus dilakukan?",
    jawaban: "Buka kembali tautan halaman sukses yang Anda terima. Bila tautan hilang, hubungi panitia SPMB lewat kontak di bagian bawah situs.",
    keywords: ["hilang", "lupa", "nomor", "pendaftaran", "tautan", "kontak"],
    kategori: "Status",
  },
] as const;
