UPDATE "FormField"
SET "opsi" = '[
  {"nilai":"Teman/saudara/keluarga","label":"Teman/saudara/keluarga"},
  {"nilai":"Sosmed","label":"Sosmed"},
  {"nilai":"Alumni","label":"Alumni"},
  {"nilai":"Sosialisasi SPMB","label":"Sosialisasi SPMB"},
  {"nilai":"Lainnya (tulis sendiri)","label":"Lainnya (tulis sendiri)"}
]'::jsonb,
    "teksBantuan" = 'Pilih sumber yang tersedia atau pilih Lainnya lalu tulis sendiri.'
WHERE "kunci" = 'referensi_pendaftar';