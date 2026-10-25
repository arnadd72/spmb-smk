# Catatan Revisi (diskusi 24-25 Okt 2026)

Status: **baru diskusi, belum ada kode yang diubah.** Menunggu rekan setim selesai push, lalu `git pull` dan ringkas ulang
perubahannya sebelum mulai. Setiap keputusan di sini harus dipindah ke `docs/PRD.md` di commit yang sama dengan kodenya
(aturan CLAUDE.md). Berkas ini hanya catatan kerja sementara.

## Urutan kerja yang disepakati

1. Selidiki dulu kenapa Drive hanya berisi 3 pendaftar padahal di web ada 5 (lihat A).
2. Pindahkan semua penyimpanan gambar ke Drive dan lepas Cloudinary (B).
3. Berkas Drive tampil di sisi admin dan di form edit pendaftar (C).
4. Email wajib, kirim nomor pendaftaran, unduh ulang formulir (D).
5. Deteksi pendaftar ganda (E).
6. OCR (F) dan audit Tanya Panitia (G).

## A. Drive hanya berisi 3 dari 5 pendaftar

Fakta dari kode (`src/server/services/pendaftaran.ts`, `pindahkanKeDrive`):
- Sinkron ke Drive dijalankan setelah pendaftaran tersimpan. Gagal hanya masuk `console.error`, status jadi `menunggu` atau `gagal`.
- Folder pendaftar baru dibuat kalau ada berkas yang dipindah. Pas foto berawalan `cld:` (Cloudinary) sengaja dilewati.
- Tombol "Sinkron semua" (Pengaturan) sudah diklik, hasilnya tetap 3. Pesan di samping tombol belum dilaporkan.

Hipotesis (belum dibuktikan):
1. 2 pendaftar itu tidak punya berkas selain pas foto (atau data input manual admin), jadi tidak ada yang dipindah.
2. Sinkron gagal dengan error tertentu (kuota, token, berkas sementara hilang).
3. Status `berkasSinkron` sudah `selesai` padahal berkas belum ada di Drive.

Langkah: baca status `berkasSinkron`, `aktaFileId`, `kkFileId`, `berkasMeta` kedua pendaftar (query baca-saja, cek
`DATABASE_URL` dulu agar tidak ke Supabase tim), lalu jalankan sinkron per pendaftar dan baca error aslinya.

Tambahan: kegagalan sinkron perlu terlihat oleh admin (sekarang hanya log server).

Catatan Google Cloud: mode **Testing** membuat refresh token hangus tiap 7 hari. Untuk produksi ubah ke **In production**
(scope `drive.file` non-sensitif, tidak perlu verifikasi). Redirect URI Vercel ditambahkan di Fase B.

## B. Semua gambar ke Google Drive, lepas Cloudinary

Permintaan:
- Dokumen pendaftaran (KK, akta, pas foto, rapor, berkas kustom) disimpan di Drive.
- Foto web (beranda, galeri, berita, dll.) juga di Drive. Saat admin mengganti foto web, hasilnya tersimpan di Drive.
- Struktur folder rapi supaya mudah dirawat.
- Cloudinary dicabut sepenuhnya (kode `driverCloudinary`, `services/cloudinary`, env `CLOUDINARY_*`).

Usulan struktur folder (belum final):
```
SPMB/
  {periode}/                     contoh 2026-2027
    pendaftar/
      {nomor} - {NAMA}/          akta, kk, pas_foto, rapor, berkas kustom
  situs/
    beranda/  galeri/  berita/  agenda/  testimoni/  lainnya/
```

Risiko dan hal yang harus diputuskan:
- **Foto web bersifat publik, tapi aturan proyek: berkas Drive tidak pernah punya URL publik.** Solusi: server membaca dari Drive
  dan menyajikannya lewat route sendiri (proxy) dengan header cache panjang. Perlu diuji kecepatan dan batas kuota Drive API;
  pertimbangkan cache di CDN Vercel. Putuskan sebelum membangun.
- Pas foto lama di Cloudinary (`cld:`) perlu migrasi sekali jalan ke Drive sebelum Cloudinary dicabut.
- Penyimpanan sementara (Supabase Storage) tetap dibutuhkan untuk berkas sebelum formulir dikirim.
- Perubahan arsitektur: perbarui PRD (bagian storage 7.x dan tabel keputusan).

## C. Berkas Drive tampil di web

- Sisi admin: saat membuka data siswa, foto KK, akta, pas foto (dan rapor) diambil dari Drive dan tampil di halaman admin.
  Sudah ada route `api/v1/admin/peserta/[id]/berkas` yang mengalirkan berkas dari Drive; periksa apakah masih terpakai setelah halaman
  verifikasi dihapus, dan pastikan pratinjaunya tampil.
- Sisi pendaftar: pada form edit (`/edit-formulir`, baru dari rekan setim) berkas yang sudah diunggah tampil sebagai pratinjau, bisa
  diganti. Tetap tanpa URL publik: lewat route yang memeriksa kepemilikan (nomor + token akses).
- Tombol sinkron per pendaftar hilang bersama halaman verifikasi; pertimbangkan menaruhnya di halaman detail pendaftar.

## D. Email, kode pendaftaran, unduh ulang formulir

- Email menjadi **wajib bila pendaftar mengisi email** (bukan lagi opsional). Perlu dipastikan: form mana (wizard publik atau
  form builder `formField`), dan wajib di validasi server (`src/server/validasi`), bukan hanya di klien.
  Catatan: kalimat aslinya "saat pendaftar isi email maka itu jadi wajib"; konfirmasi apakah maksudnya field email wajib diisi
  seluruhnya (usulan gue: ya, wajib diisi).
- Kirim nomor pendaftaran ke email (sebagian sudah ada: `kirimKodePendaftaran`, cron mengulang bila gagal). Jadikan jalur utama.
- Masalah: pendaftar lupa mencetak atau mengunduh PDF formulir setelah kirim. Usulan:
  1. Halaman publik "Unduh ulang formulir": masukkan nomor pendaftaran + pembuktian (token akses dari email, atau NISN + tanggal lahir).
  2. Email kode pendaftaran memuat tautan langsung ke halaman itu.
  3. PDF dibuat ulang dari data tersimpan (`src/server/services/pdf`, hasil harus tetap identik dengan template).
  Periksa dulu apa yang sudah ada di `/edit-formulir` dan `form-akses-edit` agar tidak dibuat dobel.

## E. Pendaftar ganda (nama + tanggal lahir / NISN sama)

Pertanyaan pemilik proyek: kalau data sama (NISN, nama), apakah tetap bisa daftar atau terhenti?

Usulan (belum diputuskan):
- **NISN sama dengan pendaftar yang sudah terkirim**: hentikan pendaftaran baru, tampilkan pesan "Anda sudah terdaftar" dan arahkan
  ke kirim ulang nomor pendaftaran / unduh ulang formulir / edit formulir. Mencegah data ganda.
- **Nama + tanggal lahir sama, NISN beda atau kosong**: tetap boleh lanjut, tapi diberi peringatan ke pendaftar dan ditandai untuk
  admin (bisa saja kembar atau salah ketik NISN). Admin bisa menandai "bukan duplikat".
- Kecocokan nama dinormalisasi (huruf besar/kecil, spasi ganda, tanda baca); belum perlu pencocokan fuzzy.
- Kolom/penanda di panel admin untuk melihat daftar duplikat.
- Menyentuh pendaftar yang sudah draf dan yang sudah kirim; perhatikan data sensitif terenkripsi (pencarian lewat hash atau kolom
  ternormalisasi, jangan dekripsi massal).

## F. OCR (PaddleOCR di browser, `src/lib/ocr`, PRD Bagian 11)

Keluhan:
- **Akta**: nama ibu terisi tanggal lahir atau tempat lahir. Field bergeser ke field lain.
- **KK**: baru nomor KK yang terbaca andal. Nama orang tua, NIK orang tua, nama dan NIK pendaftar kurang akurat dan kadang aneh.
- Permintaan: kalau akurasi rendah, jangan paksa mengisi, **tapi jangan sampai semua kosong**. Cari jalan tengah.

Arah usulan:
1. Ekstraksi berbasis label (cari "Nama Ibu", "Nama Anak", dll.) lalu ambil nilai di sekitarnya, bukan posisi baris tetap.
2. Validasi per field sebelum mengisi: NIK/No KK 16 digit, tanggal valid, nama hanya huruf dan bukan tanggal atau nama kota,
   nama ibu tidak boleh sama dengan tempat lahir, dst.
3. Skor keyakinan per field. Lolos validasi dan keyakinan tinggi: isi otomatis. Meragukan: isi sebagai saran (tampil di bawah field,
   pendaftar tinggal konfirmasi). Gagal: kosongkan hanya field itu, bukan seluruh dokumen.
4. Kumpulkan sampel akta dan KK nyata (tanpa data pribadi tersebar) sebagai set uji agar perbaikan terukur. **Butuh contoh dari pemilik.**
5. Tes unit untuk parser dan validator (PRD Bagian 19).

## G. Tanya Panitia / "Tanya Sunan" (audit mendalam)

Keluhan: bila pertanyaan tidak cocok FAQ, jawaban aneh. Contoh: "ada berapa jalur pendaftaran?" dijawab "tidak, langsung saja daftar ..."
(jawaban tidak nyambung, seperti menjawab pertanyaan ya/tidak).

Rencana audit (read-only dulu, baru perbaikan):
- Alur: `src/features/tanya`, `src/server/services/tanyaPanitia.ts`, `gemini.ts`: pencocokan FAQ, ambang kecocokan, cadangan Gemini
  (hanya bila FAQ tidak cocok, PRD 1.3 butir 36), prompt sistem, dan konteks yang diberikan.
- Pertanyaan yang bisa dijawab dari data (jalur, gelombang, kuota, jadwal, jurusan, biaya) sebaiknya dijawab dari data resmi
  (konfigurasi) bukan hanya FAQ; Gemini diberi konteks itu agar tidak mengarang.
- Cek penanganan: pertanyaan ambigu, di luar topik, dan "tidak tahu" (arahkan ke kontak panitia, jangan mengarang).
- Siapkan kumpulan pertanyaan uji (jalur, syarat, jadwal, biaya, jurusan, lupa nomor, dst.) sebagai tes.
- Konfirmasi nama fitur: "Tanya Sunan" dianggap sama dengan Tanya Panitia.

## Keputusan tambahan (25 Okt 2026)

- **Kompresi sebelum simpan ke Drive** (hemat kuota): berlaku untuk dokumen pendaftar dan foto web. Usulan: `sharp` (sudah dipakai di
  `services/pdf`), sisi terpanjang maksimal ~2000 px untuk dokumen (tetap terbaca untuk verifikasi), pas foto lebih kecil, foto web
  jadi WebP. PDF tidak dikompres ulang. OCR berjalan di browser pada berkas asli, jadi kompresi tidak memengaruhi OCR.
- **Foto landing page lewat Drive**: disetujui untuk diuji coba (lihat B, risiko kecepatan dan kuota).
- **Pendaftar ganda**: usulan di E disetujui.
- **Unduh ulang formulir** digabung ke halaman edit formulir. Nama menu "Edit Formulir" di landing dinilai aneh; usulan nama baru
  menunggu keputusan (kandidat: "Cek Pendaftaran").
- **Email**: menunggu konfirmasi apakah field email wajib diisi semua pendaftar.
- **OCR**: pemilik akan menaruh foto contoh akta dan KK di `docs/`. Berisi data pribadi asli, jadi folder itu **tidak boleh di-commit**
  (tambahkan ke `.gitignore` sebelum berkas dimasukkan). Pengujian dilakukan lokal dengan pipeline OCR yang sama lewat Playwright.
- **Tanya Panitia**: diuji langsung bersama, tanpa set contoh dari pemilik.

## Keputusan final (25 Okt 2026, lanjutan)

- Nama menu "Edit Formulir" di landing diganti **"Cek Pendaftaran"** (disetujui). Halaman ini memuat lihat status, ubah data, dan unduh ulang formulir.
- **Email wajib diisi semua pendaftar** (disetujui). Wajib juga di validasi server.
- Folder sampel OCR sudah dibuat: `docs/ocr/kk`, `docs/ocr/akta`, `docs/ocr/pas-foto`. Folder `/docs/ocr/` masuk `.gitignore` karena berisi data pribadi asli.
- Database: `.env` pemilik mengarah ke Supabase. Kerja kode/dev tetap di Postgres lokal; Supabase hanya lewat `npx prisma migrate deploy` setelah disetujui.
- Menunggu rekan setim push sebelum mulai mengubah kode.

## Audit menyeluruh (setelah masalah utama selesai)

- Setelah semua poin A sampai G selesai, lakukan audit seluruh fitur untuk mencari kekurangan lain.
- **Wajib konfirmasi ke pemilik proyek dulu sebelum audit dijalankan.** Jangan mulai sendiri.

## Hasil investigasi A (26 Okt 2026, query baca-saja ke Supabase)

- 5 pendaftar, semua `berkasSinkron = selesai`. Tidak ada yang tertunda atau gagal.
- SPMB-2027-0001 sampai 0003: berkas ada di Drive (akta, KK; pas foto 0001 di Drive, pas foto 0002 dan 0003 masih di Cloudinary).
- SPMB-2027-0004 dan 0005: `berkasMeta` kosong (tidak ada satu pun berkas yang diunggah), jadi tidak ada yang dipindah ke Drive.
- Kesimpulan: bukan bug sinkron. Drive berisi 3 karena hanya 3 pendaftar yang punya berkas. Akta dan KK sekarang opsional (migrasi tes minat bakat).
- Belum terbukti: apakah 0004 dan 0005 memang tidak mengunggah, atau unggahan gagal diam-diam sebelum formulir dikirim. Perlu konfirmasi pemilik.
- Temuan untuk B: pas foto 0002 dan 0003 harus dimigrasi dari Cloudinary ke Drive sebelum Cloudinary dicabut.

## Status B (26 Okt 2026)

- Desain: `docs/superpowers/specs/2026-10-26-penyimpanan-drive-design.md`. Rencana: `docs/superpowers/plans/2026-10-26-penyimpanan-drive.md`.
- Tahap 1 selesai di branch `feat/penyimpanan-drive`: kompresi `sharp`, foto web ke `SPMB/situs/{kategori}/`, route `/api/v1/media/[id]`,
  pas foto baru tidak ke Cloudinary, folder pendaftar `{periode}/pendaftar/`. PRD butir 67.
- Berikutnya: Tahap 2 (uji kecepatan), Tahap 3 (migrasi, butuh persetujuan pemilik), Tahap 4 (cabut Cloudinary).
- Tes yang sudah gagal sebelum poin B (perubahan rekan setim, belum diperbaiki): akses-admin, dokumen x2, formbuilder, peserta, seed
  (email kini wajib), tanya.

## Hasil Tahap 2 B: uji kecepatan foto web lewat Drive (26 Okt 2026)

Build produksi lokal (`next start`), Drive sekolah sungguhan, satu foto uji 2400x1350 (42 KB) lalu dihapus lagi.
- Kompresi: tersimpan WebP 1600 px, 7,3 KB.
- `/api/v1/media/{id}` langsung: 2,8 dtk (pertama), lalu 1,3-1,5 dtk. Lokal tidak ada cache CDN, jadi setiap panggilan ke Drive.
- Lewat `next/image` (yang dipakai halaman): 1,45 dtk pertama kali, lalu 11-24 ms dari cache optimasi.
- Header: `Cache-Control: public, max-age=31536000, immutable` dan `nosniff` terkirim.
- ID berkas KK pendaftar lewat route media: 404 `{"message":"Gambar tidak ditemukan."}`.
- Kesimpulan: lambat hanya pada muat pertama tiap gambar per ukuran; setelah itu cepat. Di Vercel, CDN menambah cache di depan.

## Status D (26 Okt 2026)

Selesai di branch `feat/penyimpanan-drive` (PRD butir 68): menu "Cek Pendaftaran" di `/cek-pendaftaran` (alamat lama dialihkan), unduh ulang
formulir PDF lewat sesi, email wajib untuk semua pendaftar (termasuk luring), email dan Tanya Sunan menunjuk Cek Pendaftaran, migrasi data FAQ.
Migrasi `20261026120000_cek_pendaftaran` (dan `20261025090000_tes_minat_bakat` milik rekan setim) belum di-deploy ke Supabase: butuh
persetujuan pemilik.

## Status E (26 Okt 2026)

Selesai di branch `feat/penyimpanan-drive` (PRD butir 69): NISN sama dihentikan (wizard, kirim, input manual, ubah data); nama + tanggal lahir sama boleh
lanjut dengan peringatan; panitia melihat banner, tombol "Bukan pendaftar ganda", filter `?ganda=1`, dan peringatan dashboard.
Migrasi `20261026130000_pendaftar_bukan_duplikat` belum di-deploy ke Supabase (butuh persetujuan pemilik), bersama dua migrasi sebelumnya.
Tes: unit 344/344 lulus. E2E yang masih gagal sudah gagal sebelum B/D/E (rapor dihapus rekan setim: input manual dan ubah data peserta; wizard RT/RW
kini angka saja; Cek Status lama; axe contrast landing; galeri timing).

## Status B tuntas (26 Okt 2026)

Migrasi Cloudinary ke Drive dijalankan (9 foto web, 2 pas foto, 3 folder; gagal 0) dan diverifikasi: 9/9 foto web terbaca dari Drive.
Cloudinary dicabut total dari kode, tes, dan `.env.example`. Hapus `CLOUDINARY_*` dari `.env` lokal dan dari Vercel. Migrasi Prisma sudah di-deploy ke Supabase.

## Status F: OCR (26 Okt 2026)

Diukur pada foto asli di `docs/ocr/` (kunci jawaban `docs/ocr/kunci.json`, tidak di-commit), lalu diperbaiki: mesin (perbesar 1600 px, per-box,
orientasi otomatis), parser Akta (format kalimat, tanggal huruf), parser KK (berbasis kotak, validasi NIK dan No KK, NIK orang tua).
Hasil: 74% benar dan 5% terisi salah (awal 9% dan 13%). PRD butir 70 dan Bagian 11. Ukur ulang:
`OCR_REKAM=1 OCR_REKAM_KE=_akhir npx playwright test tests/e2e/ocr-rekam.spec.ts --workers=1` lalu `npx tsx tests/ocr-akurasi/nilai.ts _akhir --rinci`.
Foto contoh baru cukup ditaruh di `docs/ocr/akta` atau `docs/ocr/kk` dan ditambahkan ke `kunci.json`.

## Status G: Tanya Sunan (26 Okt 2026)

Diaudit dengan 40 pertanyaan terhadap data asli, lalu diperbaiki: AI menjawab lebih dulu dengan seluruh informasi resmi dan riwayat percakapan,
jawabannya diperiksa (angka, tanggal, kontak, tautan, klaim biaya), aturan dan FAQ hanya cadangan dan tidak lagi salah cocok. PRD butir 71.
Pengetahuan chatbot sebaik data: biaya, seragam, ekstrakurikuler, kepala sekolah, tes masuk, jadwal pengumuman belum ada di data; tambahkan ke FAQ admin.
Paket gratis Gemini membatasi permintaan per menit (429); cadangan tetap jujur.
