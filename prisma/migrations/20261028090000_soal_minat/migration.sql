-- Soal tes minat bakat diatur admin di Isi Situs (PRD 1.3 butir 80). Sebelumnya tertanam di kode (butir 65).
-- Satu kolom pilihan per jurusan: pilihan A = MPLB, B = AKL, C = LPK3, D = TKR.

CREATE TABLE "SoalMinat" (
    "id" BIGSERIAL NOT NULL,
    "pertanyaan" TEXT NOT NULL,
    "opsiMplb" TEXT NOT NULL,
    "opsiAkl" TEXT NOT NULL,
    "opsiLpk3" TEXT NOT NULL,
    "opsiTkr" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoalMinat_pkey" PRIMARY KEY ("id")
);

-- Tabel baru wajib mengaktifkan RLS sendiri (lihat 20261026140000_aktifkan_rls).
ALTER TABLE "SoalMinat" ENABLE ROW LEVEL SECURITY;

-- 15 soal dari sekolah yang selama ini dipakai.
INSERT INTO "SoalMinat" ("pertanyaan", "opsiMplb", "opsiAkl", "opsiLpk3", "opsiTkr", "urutan", "updatedAt") VALUES
  ('Kegiatan apa yang paling kamu sukai ketika berada di sekolah?', 'Mengatur dokumen, membuat jadwal, dan membantu kegiatan sekolah.', 'Menghitung uang, mencatat pemasukan, atau merencanakan kegiatan bisnis.', 'Mempelajari kesehatan, obat-obatan, dan cara menjaga tubuh.', 'Mengenal mesin, kendaraan, dan cara memperbaiki sesuatu.', 1, CURRENT_TIMESTAMP),
  ('Jika mendapat tugas kelompok, peran apa yang paling kamu sukai?', 'Mengatur pembagian tugas dan memastikan kegiatan berjalan teratur.', 'Mengatur anggaran, menghitung keuntungan, atau merencanakan usaha kelompok.', 'Mencari informasi tentang kesehatan dan obat-obatan.', 'Menyiapkan peralatan dan membantu menyelesaikan masalah teknis.', 2, CURRENT_TIMESTAMP),
  ('Aktivitas mana yang paling menarik bagimu?', 'Menata dokumen, menyusun arsip, dan membuat jadwal kegiatan.', 'Menghitung keuntungan penjualan, mencatat transaksi, atau merencanakan bisnis kecil.', 'Mempelajari fungsi obat dan mengenal berbagai jenis bahan kesehatan.', 'Mengamati mesin dan memahami cara kerjanya.', 3, CURRENT_TIMESTAMP),
  ('Ketika melihat seseorang mengalami kesulitan, apa yang paling mungkin kamu lakukan?', 'Membantu mengatur kebutuhan dan mencarikan informasi yang diperlukan.', 'Membantu menghitung kebutuhan biaya atau menyusun anggaran.', 'Membantu mencari informasi kesehatan yang tepercaya dan menyarankan bantuan tenaga kesehatan.', 'Membantu memeriksa kerusakan benda atau mencari penyebab masalah teknis.', 4, CURRENT_TIMESTAMP),
  ('Pelajaran atau kegiatan seperti apa yang paling membuatmu penasaran?', 'Administrasi, komunikasi, dan pengelolaan kegiatan.', 'Perhitungan, pengelolaan keuangan, dan strategi bisnis.', 'IPA, tubuh manusia, dan obat-obatan.', 'Mesin, otomotif, dan teknologi kendaraan.', 5, CURRENT_TIMESTAMP),
  ('Jika diberi tugas yang membutuhkan ketelitian, kamu lebih suka ...', 'Memeriksa kelengkapan dokumen dan memastikan susunannya rapi.', 'Memeriksa angka, mencatat transaksi, dan memastikan perhitungan benar.', 'Memeriksa informasi dan aturan penggunaan obat dengan cermat.', 'Memeriksa komponen kendaraan dan memastikan setiap bagian terpasang dengan benar.', 6, CURRENT_TIMESTAMP),
  ('Kamu ingin memulai usaha kecil-kecilan. Apa yang paling ingin kamu lakukan?', 'Mengatur jadwal kegiatan dan menyusun dokumen usaha.', 'Menentukan harga jual, menghitung modal dan keuntungan, serta merencanakan strategi penjualan.', 'Mempelajari produk kesehatan dan memastikan informasi produknya benar.', 'Memahami kebutuhan peralatan dan perawatan kendaraan untuk usaha bengkel.', 7, CURRENT_TIMESTAMP),
  ('Saat menghadapi masalah yang belum pernah kamu temui, apa yang biasanya kamu lakukan?', 'Menyusun langkah penyelesaian agar masalah lebih mudah diatur.', 'Mengumpulkan data, menghitung kemungkinan, dan mempertimbangkan solusi bisnis atau keuangan.', 'Mencari informasi tepercaya sebelum mengambil keputusan.', 'Memeriksa penyebab masalah dan mencoba memahami cara kerjanya.', 8, CURRENT_TIMESTAMP),
  ('Lingkungan belajar seperti apa yang paling kamu sukai?', 'Ruang kerja yang rapi, terorganisasi, dan mendukung komunikasi.', 'Tempat yang menyediakan kegiatan pencatatan keuangan, pengolahan data, atau simulasi bisnis.', 'Laboratorium yang bersih dengan peralatan dan bahan untuk pembelajaran kefarmasian.', 'Bengkel yang memiliki kendaraan, mesin, dan peralatan praktik.', 9, CURRENT_TIMESTAMP),
  ('Jika menemukan kesalahan dalam sebuah pekerjaan, apa yang paling mungkin kamu lakukan?', 'Memeriksa kembali urutan pekerjaan dan memperbaiki bagian yang tidak teratur.', 'Menghitung ulang, memeriksa catatan transaksi, dan mencari penyebab kesalahan.', 'Memeriksa kembali informasi dan prosedur untuk memastikan semuanya benar.', 'Memeriksa bagian yang bermasalah dan mencari penyebab kerusakannya.', 10, CURRENT_TIMESTAMP),
  ('Keterampilan apa yang paling ingin kamu kuasai?', 'Berkomunikasi secara profesional, mengelola dokumen, dan mengatur pekerjaan.', 'Membuat laporan keuangan, mencatat transaksi, menghitung keuntungan, dan mengelola bisnis.', 'Mengenal obat-obatan dan memahami prosedur pelayanan kefarmasian.', 'Merawat kendaraan dan memahami sistem mesin otomotif.', 11, CURRENT_TIMESTAMP),
  ('Jika sekolah mengadakan kunjungan belajar, tempat mana yang paling ingin kamu kunjungi?', 'Kantor perusahaan atau pusat administrasi.', 'Perusahaan akuntansi, bagian keuangan perusahaan, atau tempat usaha yang mengelola bisnis.', 'Apotek atau fasilitas pelayanan kefarmasian.', 'Bengkel mobil atau pusat perawatan kendaraan.', 12, CURRENT_TIMESTAMP),
  ('Ketika mendapatkan banyak tugas dengan batas waktu yang berbeda, apa yang akan kamu lakukan?', 'Membuat jadwal dan daftar tugas berdasarkan prioritas.', 'Menghitung anggaran atau waktu yang tersedia, memeriksa kebutuhan, dan menentukan prioritas.', 'Memastikan tugas yang berhubungan dengan kesehatan dan keselamatan dikerjakan sesuai prosedur.', 'Menentukan urutan pekerjaan berdasarkan masalah teknis yang harus diselesaikan.', 13, CURRENT_TIMESTAMP),
  ('Jika diminta membuat sebuah proyek sederhana, proyek apa yang paling menarik bagimu?', 'Membuat sistem pengarsipan atau jadwal kegiatan kelas.', 'Membuat rencana bisnis sederhana beserta modal, harga jual, dan perkiraan keuntungan.', 'Membuat media edukasi tentang penggunaan obat secara aman.', 'Membuat proyek pengenalan komponen dan perawatan kendaraan.', 14, CURRENT_TIMESTAMP),
  ('Setelah lulus SMK, bidang pekerjaan apa yang paling ingin kamu coba?', 'Administrasi perkantoran, sekretaris, atau pengelolaan layanan kantor.', 'Akuntansi, pembukuan, keuangan, administrasi bisnis, atau menjalankan usaha sendiri.', 'Bidang kefarmasian sesuai kualifikasi dan ketentuan yang berlaku.', 'Teknisi otomotif atau mekanik kendaraan ringan.', 15, CURRENT_TIMESTAMP);
