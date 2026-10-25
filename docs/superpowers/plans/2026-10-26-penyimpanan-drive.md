# Semua Gambar di Google Drive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Semua gambar baru (dokumen pendaftar dan foto web) tersimpan terkompres di Google Drive, foto lama dipindah dari Cloudinary, lalu Cloudinary dicabut.

**Architecture:** Modul `kompresi.ts` (sharp) dipakai di semua titik masuk gambar. Dokumen tetap lewat `draf-temp` lalu `pindahkanKeDrive`; foto web langsung ke `situs/{kategori}/` di Drive dengan `appProperties.spmb = "publik"` dan disajikan lewat route `GET /api/v1/media/[id]` yang hanya mengirim berkas bertanda publik, dengan cache 1 tahun. Skrip `tsx` sekali jalan memindahkan isi Cloudinary.

**Tech Stack:** Next.js 16, TypeScript, `googleapis` (Drive v3, scope `drive.file`), `sharp`, Prisma 7, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-26-penyimpanan-drive-design.md`

## Global Constraints

- Hanya `src/server` yang bicara ke Drive; route di `src/app/api/v1`; klien tidak mengimpor `src/server` kecuali lewat `schema-client.ts`.
- Profil kompresi: `dokumen` JPEG maks 2000 px q80; `pasFoto` JPEG maks 900x1200 q85; `web` WebP maks 1600 px q80; `logo` WebP lossless maks 512 px, alfa dipertahankan. Semua: `rotate()` dari EXIF, metadata dibuang, tidak memperbesar, PDF tidak disentuh, hasil lebih besar dari asli = pakai asli tanpa metadata.
- Folder Drive: `{periode}/pendaftar/{nomor} - {NAMA}/` dan `situs/{hero|galeri|berita|agenda|testimoni|jurusan|logo}/`. Nama foto web `{yyyy-mm}-{acak}.webp` (ekstensi mengikuti hasil kompresi).
- Nilai kolom gambar web: `/api/v1/media/{fileId}`, tanpa query string.
- Route media: ID tidak sah, bukan publik, terhapus, atau tidak ada = 404 yang sama tanpa rincian; hanya `image/webp|jpeg|png`; header `Cache-Control: public, max-age=31536000, immutable` dan `X-Content-Type-Options: nosniff`.
- Drive belum terhubung saat unggah foto web di produksi: 503 `"Google Drive belum terhubung. Hubungkan dari menu Pengaturan."`. Non-produksi tanpa Drive: tetap ke `public/uploads/konten`.
- Teks antarmuka Bahasa Indonesia. Keputusan masuk `docs/PRD.md` di commit yang sama. Satu commit per tahap (milestone), tes hijau dulu.
- Sebelum perintah Prisma apa pun, cek `DATABASE_URL`/`DIRECT_URL`. Tes memakai Postgres lokal `spmb_test`. Skrip migrasi ke Supabase hanya setelah pemilik setuju.

## Review Focus

1. Foto KK dari HP dengan orientasi EXIF miring: tersimpan tegak setelah metadata dibuang. Tes di Task 1.
2. ID berkas KK/akta (tanpa tanda publik) diminta lewat `/api/v1/media/{id}`: 404, tidak pernah mengalirkan isinya. Tes di Task 4.
3. Logo PNG transparan: tetap transparan setelah kompresi. Tes di Task 1.
4. Admin mengganti foto web: berkas Drive lama dihapus, tetapi `hapusMediaBila` tidak pernah menghapus berkas Drive yang tidak bertanda publik (misalnya bila URL disunting manual ke ID dokumen). Tes di Task 3.
5. Berkas kustom PDF: byte tidak berubah setelah lewat kompresi, tetap bisa dibuka admin. Tes di Task 1 dan Task 2.

---

## Tahap 1: kompresi, media Drive, route media (satu commit)

### Task 1: Modul kompresi

**Files:**
- Create: `src/server/services/kompresi.ts`
- Modify: `package.json` (jadikan `sharp` dependensi langsung, versi yang sudah terpasang di `node_modules/sharp/package.json`)
- Test: `tests/unit/kompresi.test.ts`

**Interfaces:**
- Produces: `export type ProfilKompresi = "dokumen" | "pasFoto" | "web" | "logo"`;
  `export async function kompresGambar(isi: Buffer, mime: string, profil: ProfilKompresi): Promise<{ isi: Buffer; mime: string; ext: string }>`;
  `export function profilBerkas(kunci: string): ProfilKompresi` (`"pas_foto"` -> `"pasFoto"`, lainnya -> `"dokumen"`).

- [ ] **Step 1: Tulis tes gagal** (`// @vitest-environment node`, gambar uji dibuat dengan `sharp({ create: ... })`)
  - `dokumen`: JPEG 4000x3000 -> lebar 2000, tinggi 1500, `mime === "image/jpeg"`, `ext === "jpg"`.
  - `pasFoto`: PNG 1800x2400 -> muat dalam 900x1200, `image/jpeg`.
  - `web`: JPEG 3200x1800 -> lebar 1600, `image/webp`, `ext === "webp"`.
  - `logo`: PNG 1024x1024 RGBA dengan alfa 0 di pojok -> maks 512, `metadata().hasAlpha === true`.
  - EXIF: JPEG 300x200 dengan `withMetadata({ orientation: 6 })` -> hasil 200x300 dan `metadata().exif === undefined`.
  - Gambar 400x300 `dokumen` -> tetap 400x300.
  - PDF (`Buffer.from("%PDF-1.4 ...")`, mime `application/pdf`) -> `isi` identik byte (`equals`), mime dan ext tetap.
- [ ] **Step 2:** `npx vitest run tests/unit/kompresi.test.ts` -> FAIL (modul tidak ada).
- [ ] **Step 3: Implementasi** `kompresGambar` dengan `sharp(isi).rotate().resize({ width, height, fit: "inside", withoutEnlargement: true })`, lalu `.jpeg({ quality, mozjpeg: true })` / `.webp({ quality })` / `.webp({ lossless: true })`. Tanpa `withMetadata()`. Bila hasil > asli: kembalikan `sharp(isi).rotate()` ke format asli tanpa metadata.
- [ ] **Step 4:** tes Step 2 -> PASS.

### Task 2: Kompresi dokumen di penyimpanan sementara; unggahan baru tidak ke Cloudinary

**Files:**
- Modify: `src/server/services/draf.ts` (`unggahBerkas`, sekitar baris 237-255)
- Modify: `src/server/actions/berkas.ts` (`unggahBerkasPendaftar`, sekitar baris 188-215)
- Modify: `src/server/services/penyimpanan/index.ts` (`PenyimpananGabungan.simpan` selalu ke penyimpanan lama; baca/hapus rujukan `cld:` tetap lewat Cloudinary sampai Tahap 4)
- Modify: `src/server/services/pendaftaran.ts` (`pindahkanKeDrive`: folder tujuan `${periode}/pendaftar/${nomor} - ${NAMA}`)
- Test: `tests/unit/wizard.test.ts`, `tests/unit/dokumen.test.ts` (ikuti pola yang ada di berkas itu)

**Interfaces:**
- Consumes: `kompresGambar`, `profilBerkas` (Task 1).

- [ ] **Step 1: Tulis tes gagal**
  - `unggahBerkas` dengan PNG 3000x3000 kunci `akta` -> berkas tersimpan `mime "image/jpeg"`, ref berakhiran `.jpg`, `ukuran` = panjang buffer hasil kompresi (< panjang asli).
  - `unggahBerkas` kunci `pas_foto` -> dimensi maks 900x1200.
  - `unggahBerkas` PDF untuk berkas kustom -> isi tersimpan identik byte.
  - Dengan env Cloudinary terisi palsu, `penyimpananTemp().simpan("x/pas_foto-ab.jpg", ...)` tidak memanggil `fetch` ke Cloudinary (spy `globalThis.fetch`).
  - `pindahkanKeDrive` (Drive tiruan): path simpan diawali `2026-2027/pendaftar/` (sesuaikan periode fixture).
- [ ] **Step 2:** jalankan dua berkas tes -> FAIL.
- [ ] **Step 3: Implementasi.** Validasi ukuran dan MIME tetap pada berkas asli; kompres setelah validasi; `ref`, `mime`, `ukuran` dari hasil kompresi. Validasi `pas_foto` harus gambar tetap sebelum kompresi.
- [ ] **Step 4:** tes Step 2 -> PASS, dan `npx vitest run tests/unit/penyimpanan.test.ts tests/unit/driver-cloudinary.test.ts` tetap PASS (perbarui ekspektasi tes yang memang mengharapkan pas foto baru ke Cloudinary).

### Task 3: `simpanMedia` ke Drive dan `hapusMediaBila`

**Files:**
- Create: `src/server/types/media.ts`
- Modify: `src/server/services/penyimpanan/driverDrive.ts` (opsi publik dan baca metadata)
- Modify: `src/server/services/media.ts`
- Modify: `src/app/api/v1/admin/media/route.ts` (field form `kategori`)
- Modify: `src/features/admin/konten/unggah-gambar.tsx` (prop `kategori`), `src/features/admin/konten/panel-konten.tsx` (teruskan kategori dari `konfig.api`: `berita`->`berita`, `event`->`agenda`, `galeri`->`galeri`, `hero`->`hero`, `testimoni`->`testimoni`), `src/features/admin/konten/panel-aset-situs.tsx` (`logo`->`logo`, `hero`->`hero`, `jurusan-*`->`jurusan`), dan pemakai `UnggahGambar` lain bila ada
- Create bila belum ada: `src/features/admin/konten/schema-client.ts` (re-ekspor `KATEGORI_MEDIA`, `KategoriMedia`)
- Test: `tests/unit/penyimpanan.test.ts`, `tests/unit/konten.test.ts` atau `tests/unit/aset-situs.test.ts` (pola yang ada)

**Interfaces:**
- Produces:
  - `src/server/types/media.ts`: `export const KATEGORI_MEDIA = ["hero", "galeri", "berita", "agenda", "testimoni", "jurusan", "logo"] as const; export type KategoriMedia = (typeof KATEGORI_MEDIA)[number]; export const AWALAN_MEDIA = "/api/v1/media/";`
  - `DriverDrive.simpan(path: string, isi: Buffer, mime?: string, opsi?: { publik?: boolean }): Promise<string>` (publik -> `appProperties: { spmb: "publik" }`)
  - `DriverDrive.metadataPublik(ref: string): Promise<{ mime: string } | null>` (null bila 404, `trashed`, atau tanpa tanda publik)
  - `simpanMedia(isi: Buffer, kategori: KategoriMedia): Promise<string>` -> `/api/v1/media/{fileId}`
  - `bukaMediaPublik(id: string): Promise<{ aliran: Readable; mime: string } | null>` di `media.ts`
- Consumes: `kompresGambar` (`kategori === "logo"` -> `"logo"`, lainnya `"web"`), `klienDrive`, `idFolderRoot`, `statusDrive` dari `driveOAuth.ts`.

- [ ] **Step 1: Tulis tes gagal**
  - `DriverDrive.simpan(..., { publik: true })` memanggil `files.create` dengan `requestBody.appProperties` `{ spmb: "publik" }`; tanpa opsi tidak ada `appProperties`.
  - `metadataPublik`: tanda publik dan tidak terhapus -> `{ mime }`; `trashed: true` -> null; tanpa `appProperties` -> null; galat 404 -> null.
  - `simpanMedia(jpeg, "galeri")` (Drive tiruan) -> path diawali `situs/galeri/`, nama cocok `/^\d{4}-\d{2}-[A-Za-z0-9]+\.webp$/`, hasil cocok `/^\/api\/v1\/media\/[A-Za-z0-9_-]+$/`.
  - `simpanMedia` saat Drive belum terhubung dan `NODE_ENV=production` -> `GalatApi` 503 dengan pesan pada Global Constraints.
  - Route `POST /api/v1/admin/media` tanpa `kategori` atau kategori tak dikenal -> 400 validasi.
  - `hapusMediaBila("/api/v1/media/abc")`: berkas publik -> `files.delete` dipanggil; berkas tanpa tanda publik -> `files.delete` tidak dipanggil.
- [ ] **Step 2:** jalankan berkas tes -> FAIL.
- [ ] **Step 3: Implementasi.** Urutan `simpanMedia`: validasi (sudah ada) -> kompres -> Drive bila terhubung -> selain itu non-produksi ke disk lokal, produksi 503. Cabang Cloudinary dan Supabase untuk **unggah** dihapus dari `simpanMedia`; cabang **hapus** Cloudinary dan Supabase di `hapusMediaBila` tetap.
- [ ] **Step 4:** tes Step 2 -> PASS.

### Task 4: Route `GET /api/v1/media/[id]`

**Files:**
- Create: `src/app/api/v1/media/[id]/route.ts` (baca dulu `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` untuk bentuk `params` di Next 16)
- Test: `tests/unit/media-route.test.ts` (atau berkas tes route yang sudah ada, ikuti polanya)

**Interfaces:**
- Consumes: `bukaMediaPublik` (Task 3).

- [ ] **Step 1: Tulis tes gagal** (mock `bukaMediaPublik` atau Drive tiruan)
  - ID publik -> 200, `Content-Type` sesuai, `Cache-Control: public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`, isi sama.
  - ID tanpa tanda publik, ID terhapus, ID tidak ada, dan ID `"../x"` -> keempatnya 404 dengan body identik.
  - Berkas publik ber-mime `application/pdf` -> 404.
- [ ] **Step 2:** tes -> FAIL.
- [ ] **Step 3: Implementasi** dengan pola ID `^[A-Za-z0-9_-]{10,200}$`, `Readable.toWeb` seperti `src/app/api/v1/edit-formulir/berkas/route.ts`.
- [ ] **Step 4:** tes -> PASS.

### Task 5: PRD, verifikasi penuh, commit Tahap 1

**Files:**
- Modify: `docs/PRD.md` (butir baru 1.3 "Semua gambar di Google Drive" yang menggantikan butir 56 dan 58(a), mencabut 58(b); 7.3 struktur folder dan profil kompresi; 7.4 baris `konten-publik` diganti Drive)
- Modify: `docs/catatan-revisi.md` (status B: Tahap 1 selesai)

- [ ] **Step 1:** `npm run lint` -> tanpa galat.
- [ ] **Step 2:** `npm run typecheck` -> tanpa galat.
- [ ] **Step 3:** `npm test` -> semua PASS.
- [ ] **Step 4:** `npm run test:e2e` -> semua PASS (butuh `npm run db:start`; bila e2e gagal karena hal di luar tahap ini, laporkan apa adanya).
- [ ] **Step 5: Uji manual lokal** dengan Drive terhubung: unggah satu foto galeri dari admin, pastikan berkas muncul di `SPMB/situs/galeri/` dan tampil di beranda; buka `/api/v1/media/{ID KK pendaftar}` -> 404.
- [ ] **Step 6: Commit**

```bash
git add src tests package.json package-lock.json docs/PRD.md docs/catatan-revisi.md docs/superpowers
git commit -m "feat(penyimpanan): tahap 1 poin B, gambar baru terkompres ke Google Drive

Foto web dan dokumen pendaftar baru disimpan terkompres di Drive (situs/{kategori}, {periode}/pendaftar),
foto web disajikan lewat /api/v1/media/[id] yang hanya mengirim berkas bertanda publik. Pas foto baru
tidak lagi ke Cloudinary. Permintaan pemilik proyek: satu penyimpanan, hemat kuota Drive sekolah."
```

---

## Tahap 2: uji kecepatan (tanpa commit kode)

### Task 6: Ukur foto web lewat route media

- [ ] **Step 1:** `npm run build && npm run start` lokal dengan Drive terhubung. Ukur `curl -o /dev/null -s -w "%{time_total}\n"` untuk `/_next/image?url=/api/v1/media/{id}&w=1080&q=75` tiga kali (pertama tanpa cache, lalu dua kali berikutnya).
- [ ] **Step 2:** catat hasil di `docs/catatan-revisi.md`, laporkan ke pemilik. Lanjut Tahap 3 hanya setelah pemilik setuju.

---

## Tahap 3: migrasi sekali jalan (satu commit)

### Task 7: Skrip `scripts/migrasi-ke-drive.ts`

**Files:**
- Create: `src/server/services/migrasiDrive.ts` (logika murni: rencana dari baris database)
- Create: `scripts/migrasi-ke-drive.ts` (I/O: baca database, unduh, kompres, unggah, tulis; argumen `--coba` bawaan, `--jalankan`)
- Test: `tests/unit/migrasi-drive.test.ts`

**Interfaces:**
- Produces: `type RencanaMigrasi = { tabel: "Berita" | "Event" | "Galeri" | "FotoHero" | "Testimoni" | "Jurusan" | "Pengaturan" | "Pendaftar"; id: string; kolom: string; sumber: string; kategori: KategoriMedia | "pasFoto" }`;
  `function rencanakanMigrasi(baris: { tabel; id; kolom; nilai: string | null }[]): RencanaMigrasi[]` (hanya nilai berawalan `https://res.cloudinary.com/` atau rujukan `cld:`; pemetaan kategori: Berita->berita, Event->agenda, Galeri->galeri, FotoHero->hero, Testimoni->testimoni, Jurusan->jurusan, `aset_logo`->logo, `aset_hero`->hero, pas foto->pasFoto).
- Consumes: `kompresGambar`, `simpanMedia`, `urlTerautentikasi` (masih ada sampai Tahap 4), klien Drive.

- [ ] **Step 1: Tulis tes gagal** untuk `rencanakanMigrasi`: baris Cloudinary dipetakan ke kategori di atas; nilai `/images/...`, `/api/v1/media/...`, null dilewati; menjalankan rencana dua kali pada hasil yang sudah dimigrasi menghasilkan rencana kosong.
- [ ] **Step 2:** tes -> FAIL. **Step 3:** implementasi. **Step 4:** tes -> PASS.
- [ ] **Step 5:** skrip juga memindahkan folder pendaftar lama (`{periode}/{nomor} - {NAMA}`) ke `{periode}/pendaftar/` lewat `files.update({ addParents, removeParents })`, dan untuk pas foto mengisi `kustomFileIds.pas_foto` serta `berkasMeta.pas_foto.mime = "image/jpeg"`. Laporan akhir: jumlah dipindah, dilewati, gagal per tabel dan ID baris, tanpa nama atau data pribadi.
- [ ] **Step 6:** cek `DATABASE_URL`, jalankan `npx tsx scripts/migrasi-ke-drive.ts --coba` ke Supabase, kirim laporannya ke pemilik. **Berhenti, tunggu persetujuan.**
- [ ] **Step 7:** setelah disetujui, `--jalankan`, lalu `--coba` lagi harus melaporkan 0 rencana. Periksa beranda, galeri, berita, testimoni, dan PDF formulir 0002 dan 0003 (pas foto tampil).
- [ ] **Step 8:** lint, typecheck, `npm test` hijau, commit `feat(penyimpanan): tahap 3 poin B, skrip migrasi Cloudinary ke Drive`.

---

## Tahap 4: cabut Cloudinary (satu commit)

### Task 8: Hapus kode dan env Cloudinary

**Files:**
- Delete: `src/server/services/cloudinary.ts`, `src/server/services/penyimpanan/driverCloudinary.ts`, `tests/unit/cloudinary.test.ts`, `tests/unit/driver-cloudinary.test.ts`
- Modify: `src/server/services/penyimpanan/index.ts` (hapus `PenyimpananGabungan`; `penyimpananTemp()` mengembalikan penyimpanan sementara saja), `src/server/services/pendaftaran.ts`, `src/server/actions/berkas.ts` (hapus `adalahRefCloudinary` dan sumber `"cloudinary"`), `src/server/services/media.ts` (hapus cabang hapus Cloudinary), `src/features/admin/peserta/kelola-berkas.tsx`, `src/features/admin/verifikasi/penampil-berkas.tsx`, `src/components/ui/gambar-logo.tsx`, `src/server/services/pdf/formulir.ts` bila merujuk Cloudinary
- Modify: `.env.example` (hapus `CLOUDINARY_*` dan sebutan di komentar baris 55), `docs/PRD.md` (daftar env, butir baru menyatakan Cloudinary dicabut)

- [ ] **Step 1:** `grep -rni cloudinary src tests .env.example` sebelum: catat daftar. Hapus semua.
- [ ] **Step 2:** `grep -rni cloudinary src tests .env.example` -> kosong.
- [ ] **Step 3:** lint, typecheck, `npm test`, `npm run test:e2e` -> hijau.
- [ ] **Step 4:** cek manual: detail pendaftar admin menampilkan akta, KK, pas foto dari Drive; `/edit-formulir/form` menampilkan berkas sendiri.
- [ ] **Step 5:** commit `refactor(penyimpanan): tahap 4 poin B, Cloudinary dicabut`. Beri tahu pemilik bahwa env `CLOUDINARY_*` boleh dihapus dari `.env` dan Vercel.
