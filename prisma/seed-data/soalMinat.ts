// 15 soal tes minat bakat bawaan (PRD 1.3 butir 65). Hanya data awal: migrasi 20261028090000_soal_minat dan seed mengisi tabel SoalMinat,
// setelah itu soal diatur admin dari panel. Pilihan A sampai D menunjuk MPLB, AKL, LPK3, TKR (JURUSAN_MINAT di server/validasi/minat.ts).

export const SOAL_BAWAAN = [
  {
    teks: "Kegiatan apa yang paling kamu sukai ketika berada di sekolah?",
    opsi: [
      "Mengatur dokumen, membuat jadwal, dan membantu kegiatan sekolah.",
      "Menghitung uang, mencatat pemasukan, atau merencanakan kegiatan bisnis.",
      "Mempelajari kesehatan, obat-obatan, dan cara menjaga tubuh.",
      "Mengenal mesin, kendaraan, dan cara memperbaiki sesuatu.",
    ],
  },
  {
    teks: "Jika mendapat tugas kelompok, peran apa yang paling kamu sukai?",
    opsi: [
      "Mengatur pembagian tugas dan memastikan kegiatan berjalan teratur.",
      "Mengatur anggaran, menghitung keuntungan, atau merencanakan usaha kelompok.",
      "Mencari informasi tentang kesehatan dan obat-obatan.",
      "Menyiapkan peralatan dan membantu menyelesaikan masalah teknis.",
    ],
  },
  {
    teks: "Aktivitas mana yang paling menarik bagimu?",
    opsi: [
      "Menata dokumen, menyusun arsip, dan membuat jadwal kegiatan.",
      "Menghitung keuntungan penjualan, mencatat transaksi, atau merencanakan bisnis kecil.",
      "Mempelajari fungsi obat dan mengenal berbagai jenis bahan kesehatan.",
      "Mengamati mesin dan memahami cara kerjanya.",
    ],
  },
  {
    teks: "Ketika melihat seseorang mengalami kesulitan, apa yang paling mungkin kamu lakukan?",
    opsi: [
      "Membantu mengatur kebutuhan dan mencarikan informasi yang diperlukan.",
      "Membantu menghitung kebutuhan biaya atau menyusun anggaran.",
      "Membantu mencari informasi kesehatan yang tepercaya dan menyarankan bantuan tenaga kesehatan.",
      "Membantu memeriksa kerusakan benda atau mencari penyebab masalah teknis.",
    ],
  },
  {
    teks: "Pelajaran atau kegiatan seperti apa yang paling membuatmu penasaran?",
    opsi: [
      "Administrasi, komunikasi, dan pengelolaan kegiatan.",
      "Perhitungan, pengelolaan keuangan, dan strategi bisnis.",
      "IPA, tubuh manusia, dan obat-obatan.",
      "Mesin, otomotif, dan teknologi kendaraan.",
    ],
  },
  {
    teks: "Jika diberi tugas yang membutuhkan ketelitian, kamu lebih suka ...",
    opsi: [
      "Memeriksa kelengkapan dokumen dan memastikan susunannya rapi.",
      "Memeriksa angka, mencatat transaksi, dan memastikan perhitungan benar.",
      "Memeriksa informasi dan aturan penggunaan obat dengan cermat.",
      "Memeriksa komponen kendaraan dan memastikan setiap bagian terpasang dengan benar.",
    ],
  },
  {
    teks: "Kamu ingin memulai usaha kecil-kecilan. Apa yang paling ingin kamu lakukan?",
    opsi: [
      "Mengatur jadwal kegiatan dan menyusun dokumen usaha.",
      "Menentukan harga jual, menghitung modal dan keuntungan, serta merencanakan strategi penjualan.",
      "Mempelajari produk kesehatan dan memastikan informasi produknya benar.",
      "Memahami kebutuhan peralatan dan perawatan kendaraan untuk usaha bengkel.",
    ],
  },
  {
    teks: "Saat menghadapi masalah yang belum pernah kamu temui, apa yang biasanya kamu lakukan?",
    opsi: [
      "Menyusun langkah penyelesaian agar masalah lebih mudah diatur.",
      "Mengumpulkan data, menghitung kemungkinan, dan mempertimbangkan solusi bisnis atau keuangan.",
      "Mencari informasi tepercaya sebelum mengambil keputusan.",
      "Memeriksa penyebab masalah dan mencoba memahami cara kerjanya.",
    ],
  },
  {
    teks: "Lingkungan belajar seperti apa yang paling kamu sukai?",
    opsi: [
      "Ruang kerja yang rapi, terorganisasi, dan mendukung komunikasi.",
      "Tempat yang menyediakan kegiatan pencatatan keuangan, pengolahan data, atau simulasi bisnis.",
      "Laboratorium yang bersih dengan peralatan dan bahan untuk pembelajaran kefarmasian.",
      "Bengkel yang memiliki kendaraan, mesin, dan peralatan praktik.",
    ],
  },
  {
    teks: "Jika menemukan kesalahan dalam sebuah pekerjaan, apa yang paling mungkin kamu lakukan?",
    opsi: [
      "Memeriksa kembali urutan pekerjaan dan memperbaiki bagian yang tidak teratur.",
      "Menghitung ulang, memeriksa catatan transaksi, dan mencari penyebab kesalahan.",
      "Memeriksa kembali informasi dan prosedur untuk memastikan semuanya benar.",
      "Memeriksa bagian yang bermasalah dan mencari penyebab kerusakannya.",
    ],
  },
  {
    teks: "Keterampilan apa yang paling ingin kamu kuasai?",
    opsi: [
      "Berkomunikasi secara profesional, mengelola dokumen, dan mengatur pekerjaan.",
      "Membuat laporan keuangan, mencatat transaksi, menghitung keuntungan, dan mengelola bisnis.",
      "Mengenal obat-obatan dan memahami prosedur pelayanan kefarmasian.",
      "Merawat kendaraan dan memahami sistem mesin otomotif.",
    ],
  },
  {
    teks: "Jika sekolah mengadakan kunjungan belajar, tempat mana yang paling ingin kamu kunjungi?",
    opsi: [
      "Kantor perusahaan atau pusat administrasi.",
      "Perusahaan akuntansi, bagian keuangan perusahaan, atau tempat usaha yang mengelola bisnis.",
      "Apotek atau fasilitas pelayanan kefarmasian.",
      "Bengkel mobil atau pusat perawatan kendaraan.",
    ],
  },
  {
    teks: "Ketika mendapatkan banyak tugas dengan batas waktu yang berbeda, apa yang akan kamu lakukan?",
    opsi: [
      "Membuat jadwal dan daftar tugas berdasarkan prioritas.",
      "Menghitung anggaran atau waktu yang tersedia, memeriksa kebutuhan, dan menentukan prioritas.",
      "Memastikan tugas yang berhubungan dengan kesehatan dan keselamatan dikerjakan sesuai prosedur.",
      "Menentukan urutan pekerjaan berdasarkan masalah teknis yang harus diselesaikan.",
    ],
  },
  {
    teks: "Jika diminta membuat sebuah proyek sederhana, proyek apa yang paling menarik bagimu?",
    opsi: [
      "Membuat sistem pengarsipan atau jadwal kegiatan kelas.",
      "Membuat rencana bisnis sederhana beserta modal, harga jual, dan perkiraan keuntungan.",
      "Membuat media edukasi tentang penggunaan obat secara aman.",
      "Membuat proyek pengenalan komponen dan perawatan kendaraan.",
    ],
  },
  {
    teks: "Setelah lulus SMK, bidang pekerjaan apa yang paling ingin kamu coba?",
    opsi: [
      "Administrasi perkantoran, sekretaris, atau pengelolaan layanan kantor.",
      "Akuntansi, pembukuan, keuangan, administrasi bisnis, atau menjalankan usaha sendiri.",
      "Bidang kefarmasian sesuai kualifikasi dan ketentuan yang berlaku.",
      "Teknisi otomotif atau mekanik kendaraan ringan.",
    ],
  },
] as const;
