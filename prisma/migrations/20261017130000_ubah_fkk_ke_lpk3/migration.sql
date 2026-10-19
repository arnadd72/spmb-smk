UPDATE "Jurusan"
SET "kode" = 'LPK3',
    "nama" = 'Layanan Penunjang Kefarmasian Klinis dan Komunitas'
WHERE "kode" = 'FKK';

UPDATE "Pendaftar" AS p
SET "rekomendasiSkor" = (
  SELECT jsonb_agg(
    CASE
      WHEN skor->>'kode' = 'FKK' THEN jsonb_set(skor, '{kode}', '"LPK3"'::jsonb)
      ELSE skor
    END
    ORDER BY urutan
  )
  FROM jsonb_array_elements(p."rekomendasiSkor") WITH ORDINALITY AS item(skor, urutan)
)
WHERE jsonb_typeof(p."rekomendasiSkor") = 'array'
  AND p."rekomendasiSkor" @> '[{"kode":"FKK"}]'::jsonb;