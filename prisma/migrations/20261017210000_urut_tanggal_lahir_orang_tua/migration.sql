UPDATE "FormField"
SET "urutan" = CASE "kunci"
  WHEN 'ayah_pendidikan' THEN 13
  WHEN 'pekerjaan_ayah' THEN 14
  WHEN 'nik_ayah' THEN 15
  WHEN 'ibu_pendidikan' THEN 23
  WHEN 'pekerjaan_ibu' THEN 24
  WHEN 'nik_ibu' THEN 25
  WHEN 'alamat_ortu' THEN 26
  ELSE "urutan"
END
WHERE "kunci" IN ('ayah_pendidikan', 'pekerjaan_ayah', 'nik_ayah', 'ibu_pendidikan', 'pekerjaan_ibu', 'nik_ibu', 'alamat_ortu');