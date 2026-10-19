UPDATE "FormField" AS f
SET "opsi" = (
  SELECT jsonb_agg(
    CASE e->>'label'
      WHEN 'Kurang dari Rp 500.000' THEN jsonb_set(e, '{label}', to_jsonb('Kurang dari Rp500.000'::text))
      WHEN 'Rp 500.000 - Rp 999.999' THEN jsonb_set(e, '{label}', to_jsonb('Rp500.000–999.999'::text))
      WHEN 'Rp 1.000.000 - Rp 1.999.999' THEN jsonb_set(e, '{label}', to_jsonb('Rp1.000.000–1.999.999'::text))
      WHEN 'Rp 2.000.000 - Rp 4.999.999' THEN jsonb_set(e, '{label}', to_jsonb('Rp2.000.000–4.999.999'::text))
      WHEN 'Rp 5.000.000 atau lebih' THEN jsonb_set(e, '{label}', to_jsonb('Rp5.000.000 atau lebih'::text))
      ELSE e
    END
    ORDER BY urutan
  )
  FROM jsonb_array_elements(f."opsi") WITH ORDINALITY AS item(e, urutan)
)
WHERE f."kunci" = 'penghasilan'
  AND jsonb_typeof(f."opsi") = 'array';