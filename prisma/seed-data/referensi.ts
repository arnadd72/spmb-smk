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
    kode: "LPK3",
    nama: "Layanan Penunjang Kefarmasian Klinis dan Komunitas",
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

export const FAQ = [
  {
    pertanyaan: "Apakah saya perlu membuat akun untuk mendaftar?",
    jawaban: "Tidak perlu. Pendaftaran dilakukan tanpa akun. Setelah mengirim formulir, Anda mendapat nomor pendaftaran dan tautan halaman sukses. Simpan keduanya.",
    keywords: ["akun", "login", "daftar", "registrasi"],
    kategori: "Pendaftaran",
  },
  {
    pertanyaan: "Dokumen apa yang harus disiapkan?",
    jawaban: "Ijazah fisik dan rapor tidak wajib dan tidak perlu diunggah. Akta Kelahiran dan Kartu Keluarga dapat diunggah bila tersedia. Saat datang ke sekolah, bawa berkas yang tersedia sesuai arahan panitia.",
    keywords: ["dokumen", "berkas", "persyaratan", "syarat", "akta", "kk", "upload"],
    kategori: "Persyaratan",
  },
  {
    pertanyaan: "Apakah perlu mengisi nilai rapor?",
    jawaban: "Tidak. Nilai rapor tidak diminta saat mendaftar. Untuk saran jurusan, Anda bisa mengerjakan tes minat bakat di Langkah 3 (opsional).",
    keywords: ["rapor", "nilai", "upload", "unggah", "foto"],
    kategori: "Cara Upload",
  },
  {
    pertanyaan: "Bagaimana rekomendasi jurusan dihitung?",
    jawaban: "Rekomendasi dihitung dari jawaban tes minat bakat di Langkah 3 (opsional): 15 pertanyaan, tiap pilihan jawaban mengarah ke satu jurusan, dan jurusan dengan jawaban terbanyak menjadi saran utama. Hasilnya hanya saran. Anda bebas memilih jurusan sendiri.",
    keywords: ["rekomendasi", "jurusan", "minat", "bakat", "tes", "saran", "pilihan"],
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
