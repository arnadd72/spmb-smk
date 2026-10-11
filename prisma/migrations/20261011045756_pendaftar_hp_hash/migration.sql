-- AlterTable
ALTER TABLE "Pendaftar" ADD COLUMN     "noHpHash" TEXT;

-- CreateIndex
CREATE INDEX "Pendaftar_noHpHash_idx" ON "Pendaftar"("noHpHash");
