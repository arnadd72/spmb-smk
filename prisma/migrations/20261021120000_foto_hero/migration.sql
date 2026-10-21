-- Foto tambahan hero beranda (slideshow). Foto pertama tetap "Foto utama beranda" dari pengaturan aset.
CREATE TABLE "FotoHero" (
    "id" BIGSERIAL NOT NULL,
    "judul" TEXT,
    "gambar" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoHero_pkey" PRIMARY KEY ("id")
);
