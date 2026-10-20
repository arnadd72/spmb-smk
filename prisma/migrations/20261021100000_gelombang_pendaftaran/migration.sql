-- Gelombang pendaftaran (PRD v4 1.3 butir 44)
CREATE TABLE "Gelombang" (
    "id" BIGSERIAL NOT NULL,
    "periode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "buka" TEXT NOT NULL,
    "tutup" TEXT NOT NULL,
    "kuota" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gelombang_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Gelombang_periode_urutan_idx" ON "Gelombang"("periode", "urutan");

ALTER TABLE "Pendaftar" ADD COLUMN "gelombangId" BIGINT;
CREATE INDEX "Pendaftar_gelombangId_idx" ON "Pendaftar"("gelombangId");
ALTER TABLE "Pendaftar" ADD CONSTRAINT "Pendaftar_gelombangId_fkey" FOREIGN KEY ("gelombangId") REFERENCES "Gelombang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Sama seperti tabel lain: akses hanya lewat backend, bukan API publik Supabase.
ALTER TABLE "Gelombang" ENABLE ROW LEVEL SECURITY;
