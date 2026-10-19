UPDATE "FormField"
SET "wajib" = false,
    "tampil" = true
WHERE "kunci" = 'nilai_rapor';

UPDATE "Faq"
SET "jawaban" = 'Ijazah fisik tidak wajib dan tidak perlu diunggah. Akta kelahiran dan kartu keluarga dapat diunggah bila tersedia. Nilai rapor SMP/MTs juga opsional; jika diisi, nilainya dapat dimasukkan manual atau dibaca dari foto di HP (foto rapor tidak disimpan). Saat verifikasi, bawa berkas yang tersedia sesuai arahan panitia.'
WHERE "pertanyaan" = 'Dokumen apa yang harus disiapkan?'
  AND "jawaban" = 'Siapkan foto atau pindaian Akta Kelahiran dan Kartu Keluarga untuk diunggah, serta rapor SMP/MTs untuk dibaca nilainya (foto rapor tidak disimpan). Pada saat verifikasi, bawa berkas fisik sesuai daftar di halaman sukses.';