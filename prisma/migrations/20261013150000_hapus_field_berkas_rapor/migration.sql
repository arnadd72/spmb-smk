-- Foto rapor tidak lagi diunggah (PRD 1.3 butir 40): hanya nilainya yang dibaca di browser dan disimpan.
-- Isian berkas "rapor" dihapus dari form builder. Kolom Pendaftar.raporFileIds dibiarkan untuk data lama.
DELETE FROM "FormField" WHERE "kunci" = 'rapor';
