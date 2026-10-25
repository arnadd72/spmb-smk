# Hapus Pendaftar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Superadmin bisa menghapus pendaftar secara permanen (database, catatan OCR, berkas sementara, dan folder Google Drive) dengan memilih manual, rentang tanggal, atau rentang nomor urut, dikonfirmasi dengan password.

**Architecture:** Satu halaman admin `/admin/hapus-pendaftar` (khusus `PERAN.sistem`) memanggil tiga rute API di `/api/v1/admin/hapus-pendaftar`. Logika ada di `src/server/actions/hapusPendaftar.ts`. Penghapusan berjalan bertahap, 10 pendaftar per permintaan, per pendaftar urutannya: folder Drive, berkas sementara, lalu database (transaksi) dan audit. Bila Drive gagal untuk satu pendaftar, pendaftar itu dibiarkan utuh dan dilaporkan.

**Tech Stack:** Next.js 16 route handlers, Prisma 7, bcryptjs, Zod, googleapis (lewat `PenyimpananDokumen`), Vitest, Playwright.

**Spec:** disetujui pemilik proyek di percakapan 25 Okt 2026 (pilihan tata letak B: halaman terpisah dengan tiga tab). Ringkasannya dicatat di PRD butir 75 (Task 5).

## Global Constraints

- Bahasa antarmuka: Bahasa Indonesia.
- Hanya superadmin: `wajibSesiAdmin(...PERAN.sistem)` di API, `wajibPeranHalaman(...PERAN.sistem)` di halaman.
- Hapus permanen: Drive, berkas sementara, catatan OCR (`OcrHasil.pendaftarId`), dan baris `Pendaftar`. Log audit tetap, hanya berisi nomor, nama, periode, dan sumber (tanpa NIK, NISN, HP, email).
- Maksimal **500** pendaftar per operasi (`MAKS_HAPUS`), **10** per permintaan (`MAKS_PER_PERMINTAAN`).
- Password admin diminta di setiap permintaan hapus. 5 kali salah dalam 15 menit mengunci sementara (tabel `PercobaanLogin`, username penanda `hapus:{userId}`, pola `loginAdmin.ts`).
- Rentang tanggal memakai zona WIB (`+07:00`), seperti `kondisiPeserta` di `src/server/actions/peserta.ts`.
- Nomor urut = 4 digit di ujung `nomorPendaftaran`, dalam satu `periode` (bawaan periode berjalan).
- Batas lapisan CLAUDE.md: Prisma, Drive, dan Supabase hanya di `src/server`. Klien memakai `apiFetch` ke `/api/v1`. Skema Zod ada di `src/server/validasi/`, dipakai klien lewat `schema-client.ts`.
- Tabel baru tidak ada; tidak ada migrasi. Tidak ada library baru.
- Setiap tugas berakhir dengan tes hijau dan commit. Keputusan baru dicatat di `docs/PRD.md` pada commit yang sama dengan kodenya.

## Review Focus

1. Password salah atau kosong: tidak ada yang terhapus; lima kali salah mengunci (Task 2).
2. Drive gagal di tengah batch: pendaftar yang gagal tetap utuh di database, yang lain tetap terhapus, laporan menyebut nomor yang gagal (Task 2).
3. Rentang terbalik (`dari` > `sampai`) atau tanggal tidak sah: ditolak 422, bukan menghapus semua (Task 2).
4. Jumlah cocok melebihi 500: pratinjau menolak dengan pesan yang menyuruh mempersempit rentang (Task 2).
5. Pendaftar yang punya catatan OCR: terhapus tanpa galat foreign key (Task 2).
6. ID kiriman klien tidak numerik, kosong, atau lebih dari 10: ditolak 422; ID yang sudah tidak ada dilewati, bukan galat (Task 2).
7. Peran selain superadmin (panitia, konten) dan tanpa sesi: 403/401 di API dan halaman (Task 3, Task 4).

---

### Task 1: Hapus folder pendaftar di Drive lewat `PenyimpananDokumen`

**Files:**
- Modify: `src/server/services/penyimpanan/antarmuka.ts`, `driverDrive.ts`, `driverLokal.ts`, `driverSupabaseTemp.ts`
- Modify: `tests/unit/pengaturan-drive.test.ts` (fake `PenyimpananMemori`), `tests/unit/verifikasi.test.ts` (fake Drive di `vi.hoisted`)
- Test: `tests/unit/penyimpanan.test.ts`

**Interfaces:**
- Produces: `PenyimpananDokumen.hapusFolderInduk(referensi: string, awalanNama: string): Promise<void>`. Menghapus folder yang memuat berkas `referensi` beserta isinya, **hanya** bila namanya diawali `awalanNama` dan folder itu bukan folder akar. Bila tidak cocok, melempar `Error("Folder tidak cocok dengan pendaftar, tidak dihapus.")`. Driver tanpa folder (lokal, Supabase) tidak berbuat apa-apa.

- [ ] **Step 1: Tulis tes yang gagal** di `tests/unit/penyimpanan.test.ts` untuk `DriverDrive` dengan klien `drive_v3` tiruan: `hapusFolderInduk menghapus folder induk bila nama diawali awalan`, `hapusFolderInduk menolak bila nama folder tidak cocok awalan`, `hapusFolderInduk menolak bila induk adalah folder akar`. Asersi: pemanggilan `files.delete` dengan `fileId` folder pada kasus pertama, dan tanpa panggilan `files.delete` pada dua kasus lain (kasus kedua dan ketiga `rejects.toThrow(/tidak cocok|akar/)`).
- [ ] **Step 2: Jalankan** `npx vitest run tests/unit/penyimpanan.test.ts` dan pastikan gagal karena method belum ada.
- [ ] **Step 3: Implementasi.** Tambah ke antarmuka dan ketiga driver. Di `DriverDrive`: `files.get(referensi, fields: "parents")` untuk induk, tolak bila tidak ada atau sama dengan `idFolderRoot`, `files.get(induk, fields: "name")`, tolak bila nama tidak diawali `awalanNama`, lalu `files.delete(induk)` dan `cacheFolder.clear()`. `DriverLokal` dan `DriverSupabaseTemp`: method kosong.
- [ ] **Step 4: Perbarui dua fake tes** agar tetap memenuhi antarmuka: `PenyimpananMemori` mendapat `async hapusFolderInduk() {}`; fake Drive di `verifikasi.test.ts` mendapat `hapusFolderInduk: async (_id, awalan) => { drive.folderDihapus.push(awalan); if (drive.gagal) throw new Error("Drive menolak hapus folder"); }` dengan `folderDihapus: [] as string[]` di `vi.hoisted` dan direset di `beforeEach`.
- [ ] **Step 5: Jalankan** `npx vitest run tests/unit/penyimpanan.test.ts tests/unit/pengaturan-drive.test.ts tests/unit/verifikasi.test.ts` dan `npm run typecheck`; semuanya lolos.
- [ ] **Step 6: Commit** `feat(penyimpanan): hapusFolderInduk untuk menghapus folder pendaftar di Drive`.

---

### Task 2: Aksi pratinjau, pencarian, dan hapus pendaftar

**Files:**
- Create: `src/server/validasi/hapusPendaftar.ts`, `src/server/actions/hapusPendaftar.ts`
- Test: `tests/unit/hapus-pendaftar.test.ts`

**Interfaces:**
- Consumes: `PenyimpananDokumen.hapusFolderInduk` (Task 1); `catatAudit` dari `@/server/services/audit`; `idPendaftar`/`kondisiPeserta` pola dari `src/server/actions/peserta.ts`; `penyimpananDokumen`/`penyimpananTemp` dari `@/server/services/penyimpanan`; `statusDrive` dari `penyimpanan/driveOAuth`; fixture `buatPendaftarUji` (`tests/fixture-pendaftar.ts`).
- Produces (validasi): `MAKS_HAPUS = 500`, `MAKS_PER_PERMINTAAN = 10`; `skemaPilihanHapus` (discriminated union pada `mode`: `"manual"` `{ids: string[]}` | `"tanggal"` `{periode: string, dari: "YYYY-MM-DD", sampai: "YYYY-MM-DD"}` | `"nomor"` `{periode: string, dari: number, sampai: number}`), `skemaHapus` `{ids: string[] (1..10, digit saja), password: string}`; tipe `PilihanHapus`, `InputHapus`.
- Produces (aksi): `cariUntukHapus(q: string, periode: string): Promise<BarisHapus[]>` (maks 50), `pratinjauHapus(pilihan: unknown): Promise<{ total: number; ids: string[]; contoh: BarisHapus[] }>` (contoh = 20 pertama; melempar `GalatApi.validasi` bila > `MAKS_HAPUS`, rentang terbalik, atau tanpa hasil), `hapusPendaftar(sesi: {sub: string}, mentah: unknown, ip?: string): Promise<{ terhapus: number; dilewati: number; gagal: { nomor: string; pesan: string }[] }>`. `BarisHapus = { id: string; nomor: string; nama: string; tanggal: string; sumber: string }`.

- [ ] **Step 1: Tulis tes gagal** di `tests/unit/hapus-pendaftar.test.ts` (pola `verifikasi.test.ts`: `// @vitest-environment node`, fake Drive di `vi.hoisted`, `bersih()` + seed referensi di `beforeEach`). Nama tes dan asersi:
  - `pratinjau mode tanggal memilih hanya pendaftar di rentang WIB`: dua pendaftar `createdAt` di dalam dan satu di luar rentang → `total` 2.
  - `pratinjau mode nomor memakai 4 digit ujung dalam satu periode`: nomor `SPMB-2027-0001..0004` periode `2027/2028` dan satu `0002` di periode lain → rentang 2–3 menghasilkan tepat dua ID periode itu.
  - `rentang terbalik ditolak 422` untuk tanggal dan nomor (`status` 422).
  - `lebih dari 500 cocok ditolak` (buat 501 baris lewat `prisma.pendaftar.createMany` dengan data minimal atau turunkan `MAKS_HAPUS` lewat tes tunggal; pilih yang sederhana) dengan pesan memuat `Persempit`.
  - `hapus dengan password benar menghapus pendaftar, catatan OCR, dan mencatat audit tanpa data sensitif`: pendaftar punya satu `OcrHasil`, `nik` terenkripsi terisi → setelah hapus: `pendaftar.count` 0, `ocrHasil.count` 0, satu baris audit `aksi: "pendaftar.hapus"` dengan `dataLama` hanya berisi kunci `nomor`, `nama`, `periode`, `sumber`.
  - `password salah tidak menghapus apa pun dan 5 kali salah mengunci`: enam percobaan, yang keenam `status` 429; semua pendaftar tetap ada.
  - `folder Drive pendaftar ikut dihapus dan berkas sementara dibersihkan`: pendaftar dengan `aktaFileId` terisi → `drive.folderDihapus` memuat `"{nomor} - "`.
  - `Drive gagal: pendaftar itu tetap ada, yang lain terhapus, laporan menyebut nomor`: dua pendaftar, satu ber-`aktaFileId` dengan `drive.gagal = true` → `terhapus` 1, `gagal` berisi nomornya, pendaftar itu masih ada.
  - `ID tak sah ditolak dan ID yang sudah tidak ada dilewati`: `["abc"]` → 422; ID yang tidak ada → `dilewati` 1.
- [ ] **Step 2: Jalankan** `npx vitest run tests/unit/hapus-pendaftar.test.ts`; semua gagal karena modul belum ada.
- [ ] **Step 3: Implementasi `src/server/validasi/hapusPendaftar.ts`** sesuai Interfaces (Zod 4; ID `z.string().regex(/^\d+$/)`; tanggal `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`).
- [ ] **Step 4: Implementasi `cariUntukHapus` dan `pratinjauHapus`** di `src/server/actions/hapusPendaftar.ts`. Mode tanggal: `createdAt >= dari 00:00 WIB` dan `< sampai+1 hari 00:00 WIB`. Mode nomor: `$queryRaw` dengan `CAST(RIGHT("nomorPendaftaran", 4) AS INTEGER) BETWEEN ${dari} AND ${sampai}`, `"periode" = ${periode}` dan `"nomorPendaftaran" ~ '-[0-9]{4}$'`. Mode manual: ID yang ada. Urutkan `createdAt asc`. `GalatApi.validasi` untuk rentang terbalik, nol hasil, dan lebih dari `MAKS_HAPUS` (pesan memuat "Persempit").
- [ ] **Step 5: Implementasi `hapusPendaftar`.** Urutan: parse `skemaHapus`; periksa password dengan `bcrypt.compare` terhadap `user.passwordHash` (user dari `sesi.sub`, harus aktif); hitung kegagalan `PercobaanLogin` untuk `hapus:{sub}` dalam 15 menit (`>= 5` → `GalatApi.terlaluBanyak()`), catat kegagalan, hapus catatan gagal saat berhasil. Lalu per ID, berurutan: ambil baris (hilang → `dilewati++`); kumpulkan ID Drive (`aktaFileId`, `kkFileId`, `raporFileIds`, `kustomFileIds`); bila ada ID Drive: tolak bila `statusDrive().terhubung` false, lalu `hapusFolderInduk(idPertama, \`${nomor} - \`)`; galat apa pun → masuk `gagal`, lanjut ke pendaftar berikutnya tanpa menyentuh database. Hapus berkas sementara dari `berkasMeta` (abaikan galat). Transaksi Prisma: `ocrHasil.deleteMany({ where: { pendaftarId } })` lalu `pendaftar.delete`. Setelah transaksi: `catatAudit({ userId: sesi.sub, aksi: "pendaftar.hapus", entitasTipe: "pendaftar", entitasId, dataLama: { nomor, nama, periode, sumber }, ip })`.
- [ ] **Step 6: Jalankan** `npx vitest run tests/unit/hapus-pendaftar.test.ts` sampai hijau, lalu `npm run typecheck` dan `npm run lint`.
- [ ] **Step 7: Commit** `feat(admin): aksi hapus pendaftar permanen dengan password, Drive, dan audit`.

---

### Task 3: Rute API hapus pendaftar

**Files:**
- Create: `src/app/api/v1/admin/hapus-pendaftar/route.ts` (POST hapus), `.../pratinjau/route.ts` (POST), `.../cari/route.ts` (GET)
- Test: `tests/unit/hapus-pendaftar-api.test.ts`

**Interfaces:**
- Consumes: `hapusPendaftar`, `pratinjauHapus`, `cariUntukHapus` (Task 2); `wajibSesiAdmin`, `PERAN.sistem`, `periksaOrigin`, `tangani` (pola `src/app/api/v1/admin/peserta/[id]/berkas/route.ts`).
- Produces: `POST /api/v1/admin/hapus-pendaftar` body `{ ids, password }` → `200 { data: { terhapus, dilewati, gagal } }`; `POST .../pratinjau` body `PilihanHapus` → `200 { data: { total, ids, contoh } }`; `GET .../cari?q=&periode=` → `200 { data: BarisHapus[] }`.

- [ ] **Step 1: Tulis tes gagal** `hapus-pendaftar-api.test.ts` yang memanggil handler langsung dengan `Request` (cookie sesi dibuat lewat `buatToken` untuk peran `superadmin`, `panitia`, dan `konten`; lihat pola tes route admin yang sudah ada dengan `grep -l "wajibSesiAdmin" tests/unit`): `tanpa sesi → 401`, `panitia → 403` pada ketiga rute, `superadmin tanpa header origin yang sah → ditolak oleh periksaOrigin`, `superadmin + password benar menghapus dan mengembalikan jumlah`.
- [ ] **Step 2: Jalankan** tes itu; gagal karena rute belum ada.
- [ ] **Step 3: Implementasi ketiga rute** tipis: periksa origin (kecuali GET), `wajibSesiAdmin(...PERAN.sistem)`, panggil aksi dengan `ip` dari `x-forwarded-for`, kembalikan `NextResponse.json({ data })`, dibungkus `tangani`. Tambah `export const maxDuration = 60;` pada rute hapus.
- [ ] **Step 4: Jalankan** tes sampai hijau, `npm run typecheck`, `npm run lint`.
- [ ] **Step 5: Commit** `feat(admin): rute API hapus pendaftar khusus superadmin`.

---

### Task 4: Halaman admin Hapus Pendaftar

**Files:**
- Create: `src/app/(admin)/admin/(panel)/hapus-pendaftar/page.tsx`, `src/features/admin/hapus/halaman-hapus.tsx`, `src/features/admin/hapus/schema-client.ts`
- Modify: `src/components/layout/menu-admin.ts` (item "Hapus Pendaftar", `peran: SISTEM`, `ikon: "hapus"`, `siap: true`), `src/components/layout/admin-shell.tsx` (petakan `hapus: TrashIcon`)
- Test: `tests/e2e/admin-hapus-pendaftar.spec.ts`

**Interfaces:**
- Consumes: API Task 3 lewat `apiFetch`; `Dialog` dari `@/components/ui/dialog`; `Button`, `Input`/`Field` dari `src/components/ui`; `ambilKonfigWizard().tahunAjaran` untuk periode bawaan; `prisma.pendaftar.findMany({ distinct: ["periode"] })` untuk daftar periode (di halaman server).
- Produces: `<HalamanHapus periodeBawaan: string; periode: string[] />` (client). `schema-client.ts` mengekspor ulang tipe dan konstanta dari `@/server/validasi/hapusPendaftar`.

- [ ] **Step 1: Tulis tes e2e gagal** (pola `tests/e2e/edit-formulir.spec.ts` dan `masuk.ts`; pendaftar uji lewat `sisipPendaftar`): `superadmin menghapus pendaftar dengan memilih manual` (cari nama uji, centang, tekan hapus, isi password dari `buatAkunUji`, dialog menutup, pencarian ulang tidak menemukannya), `password salah menampilkan galat dan pendaftar tetap ada`, `mode tanggal menampilkan pratinjau jumlah dan daftar sebelum tombol hapus aktif`, `panitia tidak bisa membuka halaman` (`/admin/hapus-pendaftar` tidak menampilkan judul halaman; sesuai pola `wajibPeranHalaman`), `halaman lolos axe wcag2a/wcag2aa`.
- [ ] **Step 2: Jalankan** `npx playwright test tests/e2e/admin-hapus-pendaftar.spec.ts`; gagal karena halaman belum ada.
- [ ] **Step 3: Implementasi halaman server** `page.tsx`: `await wajibPeranHalaman(...PERAN.sistem)`, `metadata = { title: "Hapus pendaftar" }`, render `HalamanHapus` dengan periode bawaan dan daftar periode.
- [ ] **Step 4: Implementasi `HalamanHapus`.** Tiga tab ("Pilih manual", "Berdasarkan tanggal", "Berdasarkan nomor urut") dengan atribut ARIA tab. Manual: kolom cari memanggil `/cari`, daftar berkotak centang. Tanggal: dua input date. Nomor urut: pemilih periode dan dua input angka. Tab tanggal/nomor memanggil `/pratinjau` setelah input sah, menampilkan "N pendaftar akan dihapus" dan 20 contoh. Tombol "Hapus N pendaftar" aktif hanya bila N > 0. Dialog konfirmasi memakai `Dialog`: judul "Hapus N pendaftar secara permanen?", deskripsi menyebut database dan Drive ikut terhapus dan tidak bisa dibatalkan, input password (`type="password"`, `autoComplete="current-password"`), tombol "Batal" dan "Hapus permanen". Penghapusan mengirim ID dalam potongan 10 (`MAKS_PER_PERMINTAAN`) berurutan dengan password yang sama, menampilkan bilah progres ("23 dari 87"), lalu ringkasan: terhapus, dilewati, dan daftar `gagal` (nomor dan pesan) dengan tombol "Coba lagi yang gagal". Galat password (422/429) menghentikan proses dan tampil di dialog. Kata sandi hanya di state komponen, dibersihkan saat dialog tertutup.
- [ ] **Step 5: Tambah item menu** dan pemetaan ikon.
- [ ] **Step 6: Jalankan** tes e2e sampai hijau, lalu `npm run lint` dan `npm run typecheck`.
- [ ] **Step 7: Commit** `feat(admin): halaman Hapus Pendaftar dengan tiga cara memilih dan konfirmasi password`.

---

### Task 5: Dokumentasi PRD dan verifikasi akhir

**Files:**
- Modify: `docs/PRD.md` (butir 75 di bagian 1.3; ringkasan menu admin di Bagian 13 bila ada daftar menu)

- [ ] **Step 1: Tulis butir 75** setelah butir 74: tujuan, hanya superadmin, tiga cara memilih, hapus permanen (database, OCR, berkas sementara, folder Drive; log audit tetap tanpa data sensitif), password di tiap permintaan dengan kunci 5x/15 menit, batas 500 dan 10 per permintaan, urutan Drive lalu database dan perilaku bila Drive gagal, dampak nomor pendaftaran dipakai ulang, tidak ada fitur urungkan.
- [ ] **Step 2: Verifikasi** `npm run lint`, `npm run typecheck`, `npx vitest run tests/unit`, `npx playwright test tests/e2e/admin-hapus-pendaftar.spec.ts tests/e2e/admin-peserta.spec.ts`; semuanya hijau.
- [ ] **Step 3: Commit** `docs(prd): catat butir 75, fitur hapus pendaftar`.
