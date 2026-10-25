# Desain: semua gambar di Google Drive, lepas Cloudinary (poin B)

Tanggal: 26 Okt 2026. Status: menunggu persetujuan pemilik proyek. Catatan kerja asal: `docs/catatan-revisi.md` bagian B.

## Maksud

Pemilik proyek ingin satu tempat penyimpanan untuk semua gambar: dokumen pendaftar (akta, KK, pas foto, berkas kustom)
dan foto web (hero, galeri, berita, agenda, testimoni, foto jurusan, logo). Tempat itu Google Drive milik sekolah, yang
sudah terhubung lewat OAuth (`src/server/services/penyimpanan/driveOAuth.ts`). Alasannya: Cloudinary menambah satu layanan,
satu akun, dan satu batas kuota lagi, sedangkan Drive sudah dipakai. Folder di Drive harus rapi supaya panitia bisa
merawatnya langsung dari Drive. Gambar dikompres sebelum disimpan supaya kuota Drive hemat.

## Tujuan

1. Semua unggahan gambar baru (dokumen dan foto web) tersimpan di Drive, terkompres.
2. Struktur folder Drive yang jelas dan dapat dibaca manusia.
3. Semua gambar yang sekarang ada di Cloudinary dipindah ke Drive: 9 foto web (berita 1, agenda 1, hero tambahan 2,
   galeri 3, testimoni 2) dan 2 pas foto (SPMB-2027-0002, SPMB-2027-0003). Angka dari query baca-saja Supabase, 26 Okt 2026.
4. Kode, env, dan PRD tidak lagi menyebut Cloudinary.
5. Admin melihat akta, KK, dan pas foto dari Drive di halaman detail pendaftar; pendaftar melihat berkasnya sendiri di
   halaman edit formulir. Keduanya tetap tanpa URL publik.
6. Foto web yang disajikan lewat Drive diuji kecepatannya sebelum Cloudinary dicabut.

## Bukan tujuan

- Mengganti Supabase Storage `draf-temp` (berkas sementara sebelum formulir dikirim). Tetap dipakai.
- Mengubah OCR, wizard, atau alur sinkron selain menghapus pengecualian Cloudinary.
- Menghapus isi akun Cloudinary. Isinya dibiarkan sebagai cadangan; pemilik boleh menghapus akun belakangan.
- Fitur galeri baru atau perubahan tampilan.

## Anti-tujuan (gagal walau "jalan")

- Dokumen pendaftar bisa dibuka siapa pun lewat route media publik. Route publik **hanya** boleh menyajikan berkas yang
  ditandai publik.
- Landing page menjadi lambat terasa karena tiap pengunjung memicu panggilan ke Drive API.
- Gambar yang sudah tampil hilang atau rusak setelah migrasi.
- Metadata EXIF (termasuk lokasi GPS dari HP) ikut tersimpan.

## Batasan

- Lapisan PRD 6.4: hanya `src/server` yang bicara ke Drive. Route di `src/app/api/v1`.
- Scope OAuth `drive.file`: aplikasi hanya melihat berkas yang dibuatnya sendiri. Semua berkas baru dan hasil migrasi
  dibuat aplikasi, jadi tetap terjangkau.
- `sharp` sudah dipakai `src/server/services/pdf/formulir.ts`, tetapi baru terpasang sebagai dependensi turunan Next.
  Menjadikannya dependensi langsung di `package.json` bukan library baru.
- Next 16: `next/image` untuk path lokal tanpa query string tidak butuh konfigurasi tambahan; path dengan query string butuh
  `images.localPatterns.search` (`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`). Route media dirancang
  tanpa query string.
- Database dipakai bersama tim (Supabase). Skrip migrasi menulis ke sana, jadi wajib mode coba (dry-run) dulu dan dijalankan
  hanya setelah pemilik setuju.
- Keputusan baru masuk `docs/PRD.md` di commit yang sama dengan kodenya.

## Yang diputuskan pemilik proyek

- Semua gambar, dokumen maupun foto web, disimpan di Drive.
- Dikompres sebelum disimpan.
- Folder Drive rapi.
- Cloudinary dilepas sepenuhnya.
- Semua foto yang ada sekarang (sisi web dan pendaftar) dipindah ke Drive.
- Foto web lewat Drive diuji coba dulu.
- Akta dan KK **disimpan** dan tampil di admin. Ini mencabut PRD butir 58(b) ("akta dan KK tidak lagi disimpan"), yang
  belum pernah diterapkan di kode.

## Rancangan

### 1. Struktur folder Drive

```
{GOOGLE_DRIVE_ROOT_FOLDER_NAME, bawaan SPMB}/
  {periode, contoh 2026-2027}/
    pendaftar/
      {nomor} - {NAMA}/        akta.jpg, kk.jpg, pas_foto.jpg, berkas kustom
  situs/
    hero/  galeri/  berita/  agenda/  testimoni/  jurusan/  logo/
```

- Folder pendaftar pindah dari `{periode}/{nomor} - {NAMA}/` ke `{periode}/pendaftar/{nomor} - {NAMA}/`
  (`pindahkanKeDrive`, `src/server/services/pendaftaran.ts`).
- Tiga folder pendaftar lama (0001 sampai 0003) dipindah ke struktur baru oleh skrip migrasi (ubah induk folder lewat
  `files.update` addParents/removeParents; ID berkas tidak berubah, jadi kolom database tidak perlu diubah).
- Nama berkas foto web: `{yyyy-mm}-{acak}.webp`, supaya urut waktu saat dilihat di Drive.

### 2. Kompresi

Modul baru `src/server/services/kompresi.ts` (satu-satunya pemakai `sharp` untuk unggahan). Profil:

| Profil | Dipakai untuk | Hasil |
|---|---|---|
| `dokumen` | akta, KK, berkas kustom gambar | JPEG, sisi terpanjang maks 2000 px, kualitas 80 |
| `pasFoto` | pas foto | JPEG, maks 900x1200 px, kualitas 85 (cukup untuk kotak 3x4 di PDF) |
| `web` | foto web selain logo | WebP, sisi terpanjang maks 1600 px, kualitas 80 |
| `logo` | logo | WebP lossless atau PNG, maks 512 px, transparansi dipertahankan |

Aturan semua profil: putar sesuai EXIF lalu buang semua metadata; gambar yang lebih kecil dari batas tidak diperbesar.
PDF dan tipe non-gambar tidak disentuh. Bila hasil kompresi lebih besar dari aslinya, simpan aslinya (sudah tanpa metadata).

Titik kompresi:
- Dokumen dan pas foto: saat masuk penyimpanan sementara (`src/server/services/draf.ts` unggah draf, dan
  `unggahBerkasPendaftar` di `src/server/actions/berkas.ts`). Jadi `draf-temp` juga hemat, dan `pindahkanKeDrive` cukup
  menyalin. OCR tidak terpengaruh karena membaca berkas asli di browser.
- Foto web: di `simpanMedia` (`src/server/services/media.ts`).

### 3. Foto web dari Drive

- `simpanMedia(isi, kategori)` menerima kategori folder (`hero`, `galeri`, `berita`, `agenda`, `testimoni`, `jurusan`,
  `logo`). Pemanggil: `src/app/api/v1/admin/media/route.ts`, `src/server/actions/konten.ts`, `src/server/services/asetSitus.ts`.
- Berkas dibuat di `situs/{kategori}/` dengan `appProperties: { spmb: "publik" }`.
- Nilai yang disimpan di kolom `gambar`, `foto`, dan pengaturan `aset_*`: `/api/v1/media/{fileId}`. Diawali `/`, jadi lolos
  validasi `skemaUrl` di `asetSitus.ts` dan langsung dioptimasi `next/image` (`GambarKonten`, `GambarLogo`) tanpa
  `remotePatterns`.
- Route baru `GET /api/v1/media/[id]`:
  - `id` harus cocok pola ID Drive (huruf, angka, `-`, `_`); selain itu 404.
  - Ambil metadata (`appProperties`, `mimeType`, `trashed`). Bukan publik, terhapus, atau tidak ada: **404 yang sama**, tanpa
    rincian.
  - Hanya `image/webp`, `image/jpeg`, `image/png` yang dikirim.
  - Header: `Cache-Control: public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`. ID berkas tidak pernah
    berubah isinya (ganti foto = berkas baru), jadi cache selamanya aman. CDN Vercel dan optimasi `next/image` membuat Drive
    hanya dipanggil sekali per gambar per ukuran.
- `hapusMediaBila(url)`: rujukan `/api/v1/media/{id}` dihapus dari Drive, hanya bila berkas itu publik. Cabang Supabase
  `konten-publik` dipertahankan untuk menghapus URL lama (sekarang 0 baris, tetapi database lokal anggota tim bisa punya).
- Drive belum terhubung: unggah foto web ditolak 503 dengan pesan "Google Drive belum terhubung. Hubungkan dari menu
  Pengaturan." Pengembangan lokal tanpa Drive tetap boleh ke `public/uploads/konten` (perilaku sekarang, bukan produksi).

### 4. Pas foto dan dokumen

- `penyimpananTemp()` (`src/server/services/penyimpanan/index.ts`) kembali ke penyimpanan sementara saja;
  `PenyimpananGabungan` dihapus.
- `pindahkanKeDrive` tidak lagi melewati rujukan `cld:`; pas foto ikut ke Drive seperti akta dan KK.
- Semua cabang `adalahRefCloudinary` dan sumber "cloudinary" dihapus: `src/server/actions/berkas.ts`,
  `src/server/services/pendaftaran.ts`, `src/features/admin/peserta/kelola-berkas.tsx`,
  `src/features/admin/verifikasi/penampil-berkas.tsx`, `src/components/ui/gambar-logo.tsx` (komentar dan cabang URL luar).
- Admin dan halaman edit sudah membuka berkas lewat `bukaBerkas` (Drive bila tersinkron, selain itu sementara). Setelah
  perubahan, diperiksa ulang bahwa akta, KK, dan pas foto tampil di detail pendaftar admin dan di `/edit-formulir/form`.

### 5. Migrasi sekali jalan

Skrip `scripts/migrasi-ke-drive.ts`, dijalankan dengan `npx tsx` (sudah terpasang), memakai fungsi `src/server` yang sama
(klien Drive, kompresi, kripto). Mode bawaan `--coba`: hanya mencetak rencana. Mode `--jalankan` baru menulis.

Langkah:
1. Foto web: untuk tiap baris `Berita.gambar`, `Event.gambar`, `Galeri.gambar`, `FotoHero.gambar`, `Testimoni.foto`,
   `Jurusan.gambar`, dan pengaturan `aset_logo`/`aset_hero` yang berawalan `https://res.cloudinary.com/`: unduh lewat URL
   publiknya, kompres (profil `web` atau `logo`), simpan ke `situs/{kategori}/`, ganti nilai kolom dengan `/api/v1/media/{id}`.
2. Pas foto: untuk tiap pendaftar dengan `berkasMeta.pas_foto.ref` berawalan `cld:`: unduh lewat URL bertanda tangan
   (`urlTerautentikasi`, butuh env Cloudinary masih ada saat migrasi), kompres (`pasFoto`), simpan ke folder pendaftar,
   isi `kustomFileIds.pas_foto`, ubah `berkasMeta.pas_foto.mime` menjadi `image/jpeg`. Rujukan lama di `berkasMeta` dibiarkan,
   sama seperti setelah `pindahkanKeDrive` menghapus berkas sementara: pembaca berkas mendahulukan ID Drive.
3. Pindahkan folder pendaftar lama ke `{periode}/pendaftar/`.
4. Idempoten: baris yang sudah bukan Cloudinary dilewati, jadi aman diulang bila terhenti di tengah.
5. Laporan akhir: jumlah dipindah, dilewati, gagal (dengan nomor baris, tanpa data pribadi).

Isi Cloudinary tidak dihapus.

### 6. Urutan kerja (tiap tahap satu commit, tes hijau)

1. **Kompresi + media Drive + route media.** Kode Cloudinary masih ada tetapi tidak lagi dipakai untuk unggahan baru.
   PRD diperbarui.
2. **Uji kecepatan** foto web lewat route media (lokal dan, bila sudah ada, Vercel): waktu muat pertama dan berikutnya.
   Hasil dilaporkan ke pemilik sebelum lanjut.
3. **Skrip migrasi**: jalan `--coba` ke Supabase, laporkan ke pemilik, `--jalankan` setelah disetujui.
4. **Cabut Cloudinary**: hapus `cloudinary.ts`, `driverCloudinary.ts`, cabang terkait, env `CLOUDINARY_*` dari
   `.env.example`, tes terkait; PRD diperbarui.

### 7. Perubahan PRD

- Butir baru di 1.3: "Semua gambar di Google Drive" yang menggantikan butir 56 dan 58(a), dan mencabut 58(b).
- 7.3: struktur folder baru (bagian 1 dokumen ini) dan profil kompresi.
- 7.4: baris `konten-publik` diganti rujukan ke Drive; `draf-temp` tetap.
- Daftar env: hapus `CLOUDINARY_*`.

### 8. Tes (PRD Bagian 19)

Unit (Vitest, Drive dipalsukan lewat antarmuka `PenyimpananDokumen` atau klien tiruan):
- `kompresi`: ukuran maksimum dipatuhi, EXIF hilang, PDF tidak diubah, gambar kecil tidak diperbesar, logo tetap transparan.
- `simpanMedia`: menulis ke folder kategori yang benar dengan tanda publik dan mengembalikan `/api/v1/media/{id}`.
- Route media: berkas publik terkirim dengan header cache dan `nosniff`; berkas tanpa tanda publik, terhapus, tidak ada,
  atau ID tidak sah menghasilkan 404 yang sama.
- `pindahkanKeDrive`: pas foto ikut dipindah; folder tujuan `{periode}/pendaftar/...`.
- Skrip migrasi: fungsi pemetaan (baris lama ke rencana) diuji terpisah dari I/O; mode `--coba` tidak menulis; idempoten.

E2E: suite yang ada (`hero-slideshow`, `edit-formulir`, wizard) tetap hijau.

## Risiko

- **Kuota Drive** akun Google gratis 15 GB dipakai bersama Gmail dan Foto. Dengan kompresi, satu pendaftar sekitar 1 MB.
- **Muat pertama lambat**: tiap gambar baru melewati Drive sekali sebelum masuk cache. Diukur di tahap 2.
- **Drive terputus** (refresh token hangus di mode Testing tiap 7 hari): foto web lama tetap tampil dari cache, tetapi gambar
  yang belum pernah di-cache dan unggahan baru gagal. Status aplikasi OAuth harus "In production" sebelum go-live (PRD 7.3).
- **Database bersama**: skrip migrasi mengubah data tim; mode coba dan persetujuan pemilik wajib.

## Diserahkan ke pelaksana

- Nama fungsi dan pembagian berkas di dalam `src/server/services`.
- Cara memalsukan klien Drive di tes.
- Angka kualitas kompresi boleh disetel ulang bila hasil uji menunjukkan teks KK tidak terbaca.

## Keputusan yang diambil Claude (periksa)

- Foto bawaan yang ada di repo (`public/images/...`: logo, hero, 5 foto galeri, foto jurusan bawaan) **tetap di repo**
  sebagai cadangan saat admin belum memilih foto, dan tidak dipindah ke Drive.
- Isi Cloudinary tidak dihapus setelah migrasi.
- Kompresi dokumen dilakukan saat masuk penyimpanan sementara, bukan saat pindah ke Drive.
- Folder pendaftar lama dipindah ke struktur baru.
- Cabang hapus Supabase `konten-publik` dipertahankan.
