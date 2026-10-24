-- Nilai rapor diganti tes minat bakat di langkah 3 wizard (PRD 1.3 butir 65). Migrasi data saja, skema tidak berubah:
-- data rapor lama, tabel MataPelajaran, dan BobotJurusan tetap ada tetapi tidak dipakai lagi.

-- Isian "Nilai rapor" tidak lagi ada di wizard; soal tes minat bakat tidak lewat form builder.
DELETE FROM "FormField" WHERE "kunci" = 'nilai_rapor';

-- FAQ bawaan yang masih menyebut nilai rapor. Hanya baris yang jawabannya masih membahas nilai rapor yang diubah.
UPDATE "Faq"
SET "jawaban" = 'Ijazah fisik dan rapor tidak wajib dan tidak perlu diunggah. Akta Kelahiran dan Kartu Keluarga dapat diunggah bila tersedia. Saat datang ke sekolah, bawa berkas yang tersedia sesuai arahan panitia.',
    "keywords" = '["dokumen", "berkas", "persyaratan", "syarat", "akta", "kk", "upload"]'::jsonb
WHERE "pertanyaan" = 'Dokumen apa yang harus disiapkan?'
  AND "jawaban" ILIKE '%nilai rapor%';

UPDATE "Faq"
SET "pertanyaan" = 'Apakah perlu mengisi nilai rapor?',
    "jawaban" = 'Tidak. Nilai rapor tidak diminta saat mendaftar. Untuk saran jurusan, Anda bisa mengerjakan tes minat bakat di Langkah 3 (opsional).',
    "keywords" = '["rapor", "nilai", "upload", "unggah", "foto"]'::jsonb
WHERE "pertanyaan" = 'Bagaimana cara mengunggah rapor?';

UPDATE "Faq"
SET "jawaban" = 'Rekomendasi dihitung dari jawaban tes minat bakat di Langkah 3 (opsional): 15 pertanyaan, tiap pilihan jawaban mengarah ke satu jurusan, dan jurusan dengan jawaban terbanyak menjadi saran utama. Hasilnya hanya saran. Anda bebas memilih jurusan sendiri.',
    "keywords" = '["rekomendasi", "jurusan", "minat", "bakat", "tes", "saran", "pilihan"]'::jsonb
WHERE "pertanyaan" = 'Bagaimana rekomendasi jurusan dihitung?'
  AND "jawaban" ILIKE '%nilai rapor%';
