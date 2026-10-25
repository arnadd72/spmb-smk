-- Deteksi pendaftar ganda (poin E, PRD 1.3 butir 69): penanda panitia bahwa pendaftar dengan nama dan tanggal lahir yang sama
-- dengan pendaftar lain sudah diperiksa dan bukan orang yang sama. Kolom baru dengan nilai bawaan; data lama tidak berubah.
ALTER TABLE "Pendaftar" ADD COLUMN "bukanDuplikat" BOOLEAN NOT NULL DEFAULT false;
