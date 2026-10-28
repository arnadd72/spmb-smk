# Soal Tes Minat Bakat Bisa Diatur Admin: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operator konten dan superadmin bisa menambah, mengubah, mengurutkan, menonaktifkan, dan menghapus soal tes minat bakat dari panel admin (grup Isi Situs). Halaman publik `/tes-minat-bakat`, langkah 3 wizard, dan validasi server memakai soal dari database, bukan konstanta di kode.

**Architecture:** Tabel baru `SoalMinat` (urutan, teks, empat pilihan dalam kolom JSON, status aktif). Pilihan A, B, C, D tetap menunjuk MPLB, AKL, LPK3, TKR (urutan `JURUSAN_MINAT`, PRD 1.3 butir 65). CRUD memakai pola `src/server/actions/konten.ts` dan rute `/api/v1/admin/...` seperti FAQ. Server Component memuat soal lewat `src/server/services/soalMinat.ts` dan mengoper ke komponen klien lewat props. 15 soal sekarang menjadi data awal di migrasi (dan seed), bukan lagi sumber kebenaran.

**Tech Stack:** Next.js 16, Prisma 7, Zod, Vitest, Playwright. Tidak ada library baru.

**Spec:** permintaan pemilik proyek 28 Okt 2026 ("tes minat bakat bisa ditambah, dikurang, diedit dari panel admin, di Isi Situs"). Ringkasan dicatat di PRD butir baru (Task 6).

## Global Constraints

- Bahasa antarmuka: Bahasa Indonesia.
- Hak akses: `PERAN.konten` (superadmin dan operator konten) di API (`wajibSesiAdmin`) dan halaman (`wajibPeranHalaman`).
- Setiap soal tepat 4 pilihan (A sampai D), tiap pilihan tidak kosong. Teks soal 5 sampai 300 karakter, tiap pilihan 2 sampai 300. Jumlah soal maksimal 50. Tidak ada batas minimal; tanpa soal aktif, tes tidak tampil dan langkah 3 wizard tetap opsional.
- Menghapus atau menonaktifkan soal tidak mengubah hasil pendaftar yang sudah terkirim (`rekomendasiSkor` tersimpan saat pendaftaran).
- Batas lapisan CLAUDE.md: Prisma hanya di `src/server`. Klien memakai `apiFetch` ke `/api/v1` dan skema lewat `schema-client.ts`. `src/components/ui` tidak mengimpor dari `src/features`.
- Tabel baru wajib `ENABLE ROW LEVEL SECURITY` sendiri di migrasinya (catatan di `20261026140000_aktifkan_rls`).
- Migrasi ke Supabase hanya `npx prisma migrate deploy`, dijalankan pemilik proyek dengan dipandu. Jangan `migrate dev`/`db:seed` ke Supabase. Cek `DATABASE_URL` dan `DIRECT_URL` sebelum perintah Prisma apa pun.
- Setiap tugas berakhir dengan tes hijau dan commit. Keputusan dicatat di `docs/PRD.md` pada commit yang sama dengan kodenya.

## Keputusan yang saya ambil (belum disetujui pemilik)

1. Pilihan A-D tidak bisa diubah tujuan jurusannya dan jumlah pilihan tetap 4. Mengubah itu berarti mengubah rumus rekomendasi.
2. Menu bernama "Tes Minat Bakat" di grup Isi Situs, bukan submenu "Fitur". Mudah dipindah bila pemilik ingin pengelompokan "Fitur".
3. Urutan diubah dengan tombol naik/turun, bukan seret-lepas (tanpa library baru).
4. Draf pendaftar yang belum dikirim menyimpan jawaban per posisi soal. Menambah, menghapus, atau menggeser soal saat ada pendaftar sedang mengisi bisa menggeser jawaban draf mereka. Mengubah teks tidak berpengaruh. Panel admin menampilkan peringatan ini. Alternatif (jawaban per id soal) lebih aman tetapi mengubah format draf; dinilai berlebihan untuk sekarang.

## Review Focus

1. Soal kosong, pilihan kurang dari 4, atau teks terlalu panjang: ditolak 422 (Task 2).
2. Jawaban tersimpan lebih panjang dari jumlah soal aktif: ditolak; lebih pendek: diisi `null` (Task 3).
3. Tanpa soal aktif: halaman publik menampilkan pesan, wizard tetap lanjut tanpa tes, tanpa galat (Task 4).
4. Peran panitia dan tanpa sesi: 403/401 di API dan halaman (Task 2, Task 5).
5. Migrasi idempotent terhadap data awal: dijalankan di tabel baru kosong mengisi 15 soal, tidak menggandakan (Task 1).

---

### Task 1: Tabel `SoalMinat` dan data awal

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/seed-lib.ts`
- Create: `prisma/migrations/20261028090000_soal_minat/migration.sql`
- Modify: `src/server/validasi/minat.ts` (ubah `SOAL_MINAT` menjadi `SOAL_BAWAAN`, hanya untuk seed/migrasi/tes)
- Test: `tests/unit/seed.test.ts`

**Interfaces:**
- Produces: model `SoalMinat { id BigInt, urutan Int, teks String, opsi Json, isActive Boolean, createdAt, updatedAt }`, `@@index([isActive, urutan])`.

- [ ] **Step 1: Tes gagal** di `seed.test.ts`: setelah seed, `prisma.soalMinat.count()` = 15, urutan 1..15 berurutan, tiap `opsi` panjang 4.
- [ ] **Step 2: Skema + migrasi.** `CREATE TABLE "SoalMinat"`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, lalu `INSERT` 15 soal bawaan hanya bila tabel kosong (`INSERT ... SELECT ... WHERE NOT EXISTS (SELECT 1 FROM "SoalMinat")`). Teks SQL dibangkitkan dari `SOAL_BAWAAN` lewat skrip sekali pakai di scratchpad (kutip tunggal di-escape), bukan diketik tangan.
- [ ] **Step 3: Seed** (`seed-lib.ts`) mengisi `SoalMinat` dari `SOAL_BAWAAN` bila kosong (untuk database tes dan lokal).
- [ ] **Step 4: Jalankan** `npm run db:migrate` pada database LOKAL (cek `.env` dulu), `npx vitest run tests/unit/seed.test.ts`, `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(minat): tabel SoalMinat dengan 15 soal bawaan`.

---

### Task 2: Skema Zod, layanan, dan CRUD admin

**Files:**
- Modify: `src/server/validasi/minat.ts` (`skemaSoalMinat`, tipe `SoalMinat`), `src/server/actions/konten.ts` (entitas `soalMinat`, audit `soalMinat.*`)
- Create: `src/server/services/soalMinat.ts` (`muatSoalMinat({ semua? })`), `src/app/api/v1/admin/soal-minat/route.ts`, `src/app/api/v1/admin/soal-minat/[id]/route.ts`
- Test: `tests/unit/soal-minat.test.ts`

**Interfaces:**
- Produces: `muatSoalMinat(): Promise<SoalMinat[]>` (hanya aktif, urut `urutan`), `muatSoalMinat({ semua: true })` untuk admin.
- Consumes: pola `konten.ts` (`buatKonten`, `ubahKonten`, `hapusKonten`, `daftarKonten`).

- [ ] **Step 1: Tes gagal**: buat soal valid; tolak 3 pilihan, pilihan kosong, teks 4 karakter, 51 soal; ubah teks; nonaktifkan; hapus; urutan naik/turun menukar dua baris; peran panitia 403; tanpa sesi 401; audit tercatat.
- [ ] **Step 2: Implementasi** skema dan entitas; `urutan` bawaan = maksimum + 1 saat membuat.
- [ ] **Step 3: Jalankan** tes, `npm run lint`, `npm run typecheck`.
- [ ] **Step 4: Commit** `feat(minat): CRUD soal tes minat bakat di API admin`.

---

### Task 3: Validasi jawaban memakai jumlah soal dari database

**Files:**
- Modify: `src/server/validasi/minat.ts` (`skemaJawabanMinat` menjadi pabrik `skemaJawaban(jumlah)`), `src/server/services/draf.ts`, `src/server/services/pendaftaran.ts`, `src/server/actions/inputManual.ts` bila memakai jumlah soal
- Modify: `tests/unit/wizard.test.ts`, `tests/fixture-wizard.ts`
- Test: `tests/unit/wizard.test.ts`

- [ ] **Step 1: Tes gagal**: dengan 12 soal aktif, jawaban 13 elemen ditolak, 10 elemen diisi `null` sampai 12; dengan 0 soal aktif, `minat` kosong diterima.
- [ ] **Step 2: Implementasi.** `draf.ts` memuat jumlah soal aktif dari `muatSoalMinat()` lalu memakai `skemaJawaban(jumlah)`.
- [ ] **Step 3: Perbarui fixture dan tes** agar tidak lagi bergantung pada `SOAL_MINAT`.
- [ ] **Step 4: Jalankan** `npx vitest run tests/unit/wizard.test.ts tests/unit/soal-minat.test.ts`, typecheck.
- [ ] **Step 5: Commit** `refactor(minat): validasi jawaban memakai jumlah soal aktif dari database`.

---

### Task 4: Halaman publik dan wizard memakai soal dari database

**Files:**
- Modify: `src/app/(publik)/tes-minat-bakat/page.tsx`, `src/app/(daftar)/daftar/langkah/[n]/page.tsx`, `src/features/tes-minat/tes-minat-bakat.tsx`, `src/features/tes-minat/schema-client.ts`, `src/features/wizard/langkah-minat.tsx`
- Test: `tests/e2e/landing.spec.ts`, `tests/e2e/wizard.spec.ts`

- [ ] **Step 1: Tes e2e gagal**: ubah satu soal lewat database tes, halaman `/tes-minat-bakat` menampilkan teks baru; tanpa soal aktif tampil pesan "Tes belum tersedia" tanpa galat.
- [ ] **Step 2: Implementasi.** `TesMinatBakat` menerima prop `soal`. Halaman server memuat soal. Ringkasan wizard ("x dari N soal dijawab") memakai N dari database. Bila `soal` kosong, wizard melewati komponen tes.
- [ ] **Step 3: Jalankan** `npm run test:e2e -- landing wizard`, lint, typecheck.
- [ ] **Step 4: Commit** `feat(minat): halaman tes publik dan wizard membaca soal dari database`.

---

### Task 5: Halaman admin "Tes Minat Bakat"

**Files:**
- Create: `src/app/(admin)/admin/(panel)/tes-minat-bakat/page.tsx`, `src/features/admin/tes-minat/panel-soal-minat.tsx`, `src/features/admin/tes-minat/schema-client.ts`
- Modify: `src/components/layout/menu-admin.ts` (item di grup Isi Situs, `KONTEN`, ikon baru `tes`), `src/components/layout/admin-shell.tsx` (pemetaan ikon)
- Test: `tests/e2e/admin-konten.spec.ts` (atau berkas e2e admin yang ada)

- [ ] **Step 1: Tes e2e gagal**: login operator konten, buka menu Tes Minat Bakat, tambah soal, ubah teks, geser naik, nonaktifkan, hapus dengan konfirmasi; hasilnya terlihat di `/tes-minat-bakat`. Panitia tidak melihat menunya.
- [ ] **Step 2: Implementasi UI.** Daftar soal bernomor dengan status, tombol Ubah, Naik, Turun, Nonaktifkan, Hapus (dialog konfirmasi). Formulir: teks soal, empat kolom pilihan berlabel "A (MPLB)", "B (AKL)", "C (LPK3)", "D (TKR)". Peringatan tentang draf pendaftar di bagian atas. Ikuti `docs/design/DESIGN.md` dan larangan anti AI slop (PRD 16.4).
- [ ] **Step 3: Jalankan** e2e terkait, lint, typecheck, lalu cek tampilan di `npm run dev`.
- [ ] **Step 4: Commit** `feat(admin): halaman Tes Minat Bakat untuk mengatur soal`.

---

### Task 6: Dokumen dan penutupan

**Files:**
- Modify: `docs/PRD.md` (butir baru di PRD 1.3 dan bagian terkait; butir 65 ditandai diperluas), `docs/design/DESIGN.md` bila ada pola baru, `.env.example` (tidak berubah)

- [ ] **Step 1:** Catat keputusan di PRD pada commit yang sama dengan kode terakhir.
- [ ] **Step 2:** Jalankan penuh: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`. Laporkan hasil apa adanya, termasuk tes e2e merah lama ("isi form luring", butir 65) bila masih merah.
- [ ] **Step 3:** Push ke `main` hanya atas perintah pemilik. Setelah push, Vercel mendeploy otomatis; halaman tes memakai kode baru, jadi migrasi harus sudah dijalankan.
- [ ] **Step 4: Panduan migrasi Supabase** (dipandu satu langkah per balasan, tanpa rahasia di chat): periksa variabel sementara di PowerShell, `npx prisma migrate status`, `npx prisma migrate deploy`, verifikasi 15 baris di `SoalMinat`, buka halaman admin dan publik di spmb-smk-two.vercel.app.
