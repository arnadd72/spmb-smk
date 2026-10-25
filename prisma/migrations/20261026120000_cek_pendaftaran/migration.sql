-- Cek Status dan Edit Formulir digabung menjadi Cek Pendaftaran (poin D, PRD 1.3 butir 68). Migrasi data saja, skema tidak
-- berubah. Hanya FAQ bawaan yang jawabannya masih menyebut halaman Cek Status yang diubah; FAQ suntingan admin dibiarkan.
UPDATE "Faq"
SET "jawaban" = 'Buka halaman Cek Pendaftaran, lalu isi nomor pendaftaran dan tanggal lahir sesuai yang Anda daftarkan. Di sana Anda bisa melihat data, memperbaikinya, dan unduh ulang formulir PDF.'
WHERE "pertanyaan" = 'Bagaimana cara mengecek status pendaftaran?'
  AND "jawaban" = 'Buka halaman Cek Status, lalu isi nomor pendaftaran dan tanggal lahir sesuai yang Anda daftarkan.';
