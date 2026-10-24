-- Pendaftar langsung diterima tanpa verifikasi panitia (PRD 1.3 butir 62).
-- Status bawaan menjadi approved, dan pendaftar lama yang masih menunggu ikut diterima.
-- Pendaftar yang sudah ditolak atau diminta revisi dibiarkan apa adanya.
ALTER TABLE "Pendaftar" ALTER COLUMN "statusVerifikasi" SET DEFAULT 'approved';
UPDATE "Pendaftar" SET "statusVerifikasi" = 'approved', "updatedAt" = now() WHERE "statusVerifikasi" = 'pending';
