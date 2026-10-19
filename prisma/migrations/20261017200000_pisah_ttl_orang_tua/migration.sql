ALTER TABLE "Pendaftar"
  ADD COLUMN "ayahTempatLahir" TEXT,
  ADD COLUMN "ayahTanggalLahir" DATE,
  ADD COLUMN "ibuTempatLahir" TEXT,
  ADD COLUMN "ibuTanggalLahir" DATE;

DELETE FROM "FormField"
WHERE "kunci" IN ('ayah_ttl', 'ibu_ttl');