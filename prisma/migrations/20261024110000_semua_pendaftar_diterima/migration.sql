-- Status pendaftaran tidak lagi ditampilkan di admin (PRD 1.3 butir 63): semua pendaftar dianggap diterima.
-- Data lama yang masih "Perlu revisi" atau "Ditolak" diubah menjadi diterima agar konsisten (termasuk perhitungan kuota).
UPDATE "Pendaftar" SET "statusVerifikasi" = 'approved', "updatedAt" = now() WHERE "statusVerifikasi" IN ('revision', 'rejected');
