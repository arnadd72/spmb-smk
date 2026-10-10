-- CreateEnum
CREATE TYPE "Sumber" AS ENUM ('daring', 'luring');

-- CreateEnum
CREATE TYPE "StatusVerifikasi" AS ENUM ('pending', 'approved', 'rejected', 'revision');

-- CreateEnum
CREATE TYPE "StatusNilai" AS ENUM ('belumDicek', 'sesuai', 'dikoreksi');

-- CreateEnum
CREATE TYPE "BerkasSinkron" AS ENUM ('menunggu', 'selesai', 'gagal');

-- CreateTable
CREATE TABLE "Jurusan" (
    "id" BIGSERIAL NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "prospekKarir" JSONB,
    "keunggulan" JSONB,
    "kuota" INTEGER NOT NULL DEFAULT 72,
    "gambar" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jurusan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MataPelajaran" (
    "id" BIGSERIAL NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alias" JSONB NOT NULL,
    "kelompok" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "MataPelajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BobotJurusan" (
    "id" BIGSERIAL NOT NULL,
    "jurusanId" BIGINT NOT NULL,
    "mataPelajaranId" BIGINT NOT NULL,
    "bobot" DECIMAL(4,3) NOT NULL,

    CONSTRAINT "BobotJurusan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendaftaranDraft" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "langkahTerakhir" INTEGER NOT NULL DEFAULT 1,
    "berkas" JSONB NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendaftaranDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pendaftar" (
    "id" BIGSERIAL NOT NULL,
    "nomorPendaftaran" TEXT NOT NULL,
    "aksesTokenHash" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "sumber" "Sumber" NOT NULL DEFAULT 'daring',
    "statusVerifikasi" "StatusVerifikasi" NOT NULL DEFAULT 'pending',
    "statusNilai" "StatusNilai" NOT NULL DEFAULT 'belumDicek',
    "catatanVerifikasi" TEXT,
    "catatanPenolakan" TEXT,
    "diverifikasiOlehId" BIGINT,
    "diverifikasiAt" TIMESTAMP(3),
    "notifikasiEmailAt" TIMESTAMP(3),
    "namaLengkap" TEXT NOT NULL,
    "tempatLahir" TEXT,
    "tanggalLahir" DATE,
    "nisn" TEXT,
    "nik" TEXT,
    "nikHash" TEXT,
    "noKk" TEXT,
    "jenisKelamin" TEXT,
    "agama" TEXT,
    "anakKe" INTEGER,
    "jumlahSaudara" INTEGER,
    "asalSekolah" TEXT,
    "tamatTahun" TEXT,
    "noIjazah" TEXT,
    "noHp" TEXT,
    "noWa" TEXT,
    "email" TEXT,
    "alamat" TEXT,
    "rt" TEXT,
    "rw" TEXT,
    "desa" TEXT,
    "kecamatan" TEXT,
    "kabupaten" TEXT,
    "propinsi" TEXT,
    "namaAyah" TEXT,
    "ayahTtl" TEXT,
    "ayahPendidikan" TEXT,
    "pekerjaanAyah" TEXT,
    "namaIbu" TEXT,
    "ibuTtl" TEXT,
    "ibuPendidikan" TEXT,
    "pekerjaanIbu" TEXT,
    "alamatOrtu" TEXT,
    "ortuRt" TEXT,
    "ortuRw" TEXT,
    "ortuDesa" TEXT,
    "ortuKecamatan" TEXT,
    "ortuKabupaten" TEXT,
    "ortuPropinsi" TEXT,
    "noHpOrtu" TEXT,
    "penghasilan" TEXT,
    "referensiPendaftar" TEXT,
    "smpKecamatan" TEXT,
    "smpKabupaten" TEXT,
    "smpPropinsi" TEXT,
    "ijazahNomorTahun" TEXT,
    "lamaBelajar" TEXT,
    "nilaiUjian" JSONB,
    "golonganDarah" TEXT,
    "tinggiBadan" INTEGER,
    "beratBadan" INTEGER,
    "penyakitPernahDiderita" TEXT,
    "hobiOlahraga" TEXT,
    "hobiKesenian" TEXT,
    "hobiOrganisasi" TEXT,
    "hobiPrestasi" TEXT,
    "hobiLain" TEXT,
    "ukuranSeragam" TEXT,
    "nilaiRapor" JSONB NOT NULL,
    "nilaiRaporSumber" TEXT NOT NULL,
    "nilaiRaporKoreksi" JSONB,
    "rekomendasiJurusanId" BIGINT,
    "rekomendasiSkor" JSONB NOT NULL,
    "rekomendasiVersi" TEXT NOT NULL,
    "jurusan1Id" BIGINT,
    "jurusan2Id" BIGINT,
    "aktaFileId" TEXT,
    "kkFileId" TEXT,
    "raporFileIds" JSONB,
    "kustomFileIds" JSONB,
    "driveFolderId" TEXT,
    "berkasMeta" JSONB,
    "berkasSinkron" "BerkasSinkron" NOT NULL DEFAULT 'menunggu',
    "dataKustom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pendaftar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrHasil" (
    "id" BIGSERIAL NOT NULL,
    "draftId" TEXT,
    "pendaftarId" BIGINT,
    "jenis" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google_vision',
    "fields" JSONB NOT NULL,
    "confidence" JSONB NOT NULL,
    "durasiMs" INTEGER NOT NULL,
    "sukses" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrHasil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" BIGSERIAL NOT NULL,
    "pertanyaan" TEXT NOT NULL,
    "jawaban" TEXT NOT NULL,
    "keywords" JSONB NOT NULL,
    "kategori" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Berita" (
    "id" BIGSERIAL NOT NULL,
    "judul" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "gambar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Berita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" BIGSERIAL NOT NULL,
    "judul" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "deskripsi" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "lokasi" TEXT,
    "gambar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Galeri" (
    "id" BIGSERIAL NOT NULL,
    "judul" TEXT,
    "gambar" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Galeri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimoni" (
    "id" BIGSERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "keterangan" TEXT,
    "isi" TEXT NOT NULL,
    "foto" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimoni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" BIGSERIAL NOT NULL,
    "kunci" TEXT NOT NULL,
    "langkah" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "teksBantuan" TEXT,
    "tipe" TEXT NOT NULL,
    "opsi" JSONB,
    "placeholder" TEXT,
    "nilaiDefault" TEXT,
    "tampil" BOOLEAN NOT NULL DEFAULT true,
    "wajib" BOOLEAN NOT NULL DEFAULT false,
    "terkunci" BOOLEAN NOT NULL DEFAULT false,
    "urutan" INTEGER NOT NULL,
    "isKustom" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT,
    "aksi" TEXT NOT NULL,
    "entitasTipe" TEXT,
    "entitasId" TEXT,
    "dataLama" JSONB,
    "dataBaru" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Jurusan_kode_key" ON "Jurusan"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "MataPelajaran_kode_key" ON "MataPelajaran"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "BobotJurusan_jurusanId_mataPelajaranId_key" ON "BobotJurusan"("jurusanId", "mataPelajaranId");

-- CreateIndex
CREATE UNIQUE INDEX "PendaftaranDraft_tokenHash_key" ON "PendaftaranDraft"("tokenHash");

-- CreateIndex
CREATE INDEX "PendaftaranDraft_expiresAt_idx" ON "PendaftaranDraft"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Pendaftar_nomorPendaftaran_key" ON "Pendaftar"("nomorPendaftaran");

-- CreateIndex
CREATE UNIQUE INDEX "Pendaftar_aksesTokenHash_key" ON "Pendaftar"("aksesTokenHash");

-- CreateIndex
CREATE INDEX "Pendaftar_statusVerifikasi_idx" ON "Pendaftar"("statusVerifikasi");

-- CreateIndex
CREATE INDEX "Pendaftar_statusNilai_idx" ON "Pendaftar"("statusNilai");

-- CreateIndex
CREATE INDEX "Pendaftar_jurusan1Id_idx" ON "Pendaftar"("jurusan1Id");

-- CreateIndex
CREATE INDEX "Pendaftar_periode_idx" ON "Pendaftar"("periode");

-- CreateIndex
CREATE INDEX "Pendaftar_createdAt_idx" ON "Pendaftar"("createdAt");

-- CreateIndex
CREATE INDEX "Pendaftar_nisn_idx" ON "Pendaftar"("nisn");

-- CreateIndex
CREATE INDEX "Pendaftar_nikHash_idx" ON "Pendaftar"("nikHash");

-- CreateIndex
CREATE INDEX "Pendaftar_namaLengkap_idx" ON "Pendaftar"("namaLengkap");

-- CreateIndex
CREATE INDEX "OcrHasil_createdAt_idx" ON "OcrHasil"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Berita_slug_key" ON "Berita"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_kunci_key" ON "FormField"("kunci");

-- CreateIndex
CREATE INDEX "FormField_langkah_urutan_idx" ON "FormField"("langkah", "urutan");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entitasTipe_entitasId_idx" ON "AuditLog"("entitasTipe", "entitasId");

-- AddForeignKey
ALTER TABLE "BobotJurusan" ADD CONSTRAINT "BobotJurusan_jurusanId_fkey" FOREIGN KEY ("jurusanId") REFERENCES "Jurusan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BobotJurusan" ADD CONSTRAINT "BobotJurusan_mataPelajaranId_fkey" FOREIGN KEY ("mataPelajaranId") REFERENCES "MataPelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendaftar" ADD CONSTRAINT "Pendaftar_diverifikasiOlehId_fkey" FOREIGN KEY ("diverifikasiOlehId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendaftar" ADD CONSTRAINT "Pendaftar_jurusan1Id_fkey" FOREIGN KEY ("jurusan1Id") REFERENCES "Jurusan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendaftar" ADD CONSTRAINT "Pendaftar_jurusan2Id_fkey" FOREIGN KEY ("jurusan2Id") REFERENCES "Jurusan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendaftar" ADD CONSTRAINT "Pendaftar_rekomendasiJurusanId_fkey" FOREIGN KEY ("rekomendasiJurusanId") REFERENCES "Jurusan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrHasil" ADD CONSTRAINT "OcrHasil_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "PendaftaranDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrHasil" ADD CONSTRAINT "OcrHasil_pendaftarId_fkey" FOREIGN KEY ("pendaftarId") REFERENCES "Pendaftar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
