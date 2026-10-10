# PRD: Portal SPMB SMK Ma'arif NU 1 Wangon v3

| | |
|---|---|
| **Dokumen** | Product Requirements Document v3.1 |
| **Revisi v3.1** | Penyimpanan dokumen pendaftar pindah ke Google Drive (akun Google pribadi via OAuth). Lihat Bagian 7.5 |
| **Menggantikan** | PRD v2.0 (10 Oktober 2026) |
| **Dasar** | Audit kode v1 (`web_ppdb`, commit `cbed97b`), audit PRD v2, arahan pemilik proyek 10 Oktober 2026 |
| **Tujuan** | Cetak biru membangun ulang portal SPMB: tanpa login siswa, OCR sebagai satu-satunya fitur cerdas, rekomendasi jurusan dari nilai rapor, desain baru, frontend dan backend terpisah |
| **Bahasa antarmuka** | Bahasa Indonesia |
| **Status** | Acuan proyek baru. Keputusan yang masih terbuka ditandai **[KEPUTUSAN]** |

> **Cara pakai di proyek baru (untuk Claude Code / agen AI)**
> 1. Simpan file ini sebagai `docs/PRD.md` di root monorepo.
> 2. Isi `CLAUDE.md` di root dengan: `Baca docs/PRD.md sebelum mengerjakan fitur apa pun. PRD adalah sumber kebenaran fitur, skema data, API, dan aturan desain. Jangan menambah fitur di luar PRD tanpa konfirmasi.`
> 3. Tambahkan `backend/CLAUDE.md` dan `frontend/CLAUDE.md` yang merujuk Bagian 6 (struktur folder) dan aturan per lapisan.
> 4. Kerjakan sesuai milestone Bagian 20. Setiap fitur punya kriteria terima yang langsung dijadikan test.
> 5. Bagian 18 berisi bug v1 dan temuan audit v2. Jangan diulang.

---

## Daftar Isi

1. Ringkasan Perubahan v2 ke v3
2. Ringkasan Produk
3. Tujuan & KPI
4. Ruang Lingkup
5. Aktor & Hak Akses
6. Arsitektur, Tech Stack & Struktur Folder
7. Konfigurasi Supabase
8. Skema Database
9. Kontrak API
10. Fitur Publik & Wizard Pendaftaran
11. Fitur Cerdas: OCR (KK, Akta, Rapor)
12. Rekomendasi Jurusan dari Nilai Rapor
13. Panel Admin
14. Form Builder Dinamis
15. Dokumen Keluaran (PDF, XLSX, Email)
16. Arahan Desain & Motion
17. Keamanan & Privasi
18. Bug v1 & Temuan Audit PRD v2
19. Strategi Testing
20. Milestone
21. Deployment & Operasional
22. Keputusan & Pertanyaan Terbuka
23. Lampiran

---

## 1. Ringkasan Perubahan v2 ke v3

| # | Area | PRD v2 | PRD v3 | Alasan |
|---|---|---|---|---|
| 1 | Login siswa | Tidak ada (sudah benar) | **Tetap tanpa login.** Pendaftar memakai draf bertoken, token sukses, dan cek status nomor + tanggal lahir | Arahan pemilik |
| 2 | Fitur cerdas | OCR + rekomendasi minat & nilai + chatbot | **OCR satu-satunya fitur cerdas.** Chatbot menjadi pencarian FAQ biasa (bukan AI) | Arahan pemilik |
| 3 | Engine OCR | EasyOCR ditetapkan | **Belum ditetapkan.** Arsitektur driver yang bisa ditukar + spike benchmark (Bagian 11.4) | Arahan pemilik |
| 4 | Rekomendasi | Nilai 60% + minat 30% (+10% kuota), rapor opsional | **Hanya dari nilai rapor yang diunggah** dan dibaca OCR, lalu dikonfirmasi siswa. Minat dihapus. Rapor wajib | Arahan pemilik |
| 5 | Mata pelajaran | `ipa_biologi`, `ipa_fisika`, `ipa_kimia`, `ips_ekonomi` | **Mengikuti rapor SMP/MTs Kurikulum Merdeka** (IPA dan IPS terpadu) lewat tabel master mapel | Temuan audit: rapor SMP tidak memecah IPA |
| 6 | Arsitektur | Laravel monolit Blade + Alpine | **Monorepo terpisah:** `backend/` (Laravel API) dan `frontend/` (Next.js + React) + `ocr-service/` | Arahan pemilik + kebutuhan Framer Motion |
| 7 | Animasi | GSAP saja | **GSAP + Motion (dulu Framer Motion)** dengan pembagian peran jelas | Arahan pemilik |
| 8 | State wizard | Session Laravel + autosave `localStorage` | **Draf di server** (tabel `pendaftaran_drafts`, token di cookie httpOnly). `localStorage` tidak menyimpan data pribadi | API tanpa session + keamanan perangkat bersama |
| 9 | Desain | Banyak skill komunitas, arahan umum | **Arah visual konkret** (palet, tipografi, komposisi) + daftar larangan anti AI slop | Arahan pemilik |
| 10 | Nama | Campur PPDB/SPMB | **SPMB** di seluruh UI. Format nomor menjadi keputusan sekolah | Istilah resmi saat ini |
| 11 | Penyimpanan dokumen | Supabase Storage bucket privat (Free 1 GB) | **Google Drive akun Google pribadi** via OAuth (15 GB gratis). Konten publik tetap di Supabase Storage. Berkas sementara wizard di disk privat VPS | Hemat biaya: 200-300 pendaftar × 3-5 MB per periode melebihi 1 GB Supabase Free |

---

## 2. Ringkasan Produk

Portal SPMB (Sistem Penerimaan Murid Baru) adalah situs pendaftaran daring SMK Ma'arif NU 1 Wangon, Banyumas, Jawa Tengah. Isinya:

1. **Situs informasi sekolah**: profil, program keahlian, berita, agenda, galeri, testimoni alumni, FAQ.
2. **Wizard pendaftaran 8 langkah tanpa login**, mengikuti formulir kertas resmi (Bagian A-D). OCR membaca Akta, KK, dan **rapor**, lalu nilai rapor dipakai untuk rekomendasi jurusan.
3. **Panel admin panitia**: dashboard, verifikasi berkas dan nilai, data pendaftar, kuota, konten, form builder, pengaturan, ekspor.

Identitas sekolah (kop surat dan footer):

- LEMBAGA PENDIDIKAN MA'ARIF NU PCNU KAB. BANYUMAS
- SMK MA'ARIF NU 1 WANGON
- Jl. Karangjengkol RT.02/RW.04 Wangon, Banyumas 53176
- Telepon (0281) 513425 · smk_maarifnu1wgn@yahoo.co.id · www.smkmanu1wangon.sch.id

Program keahlian:

| Kode | Nama | Kuota default |
|---|---|---|
| AKL | Akuntansi dan Keuangan Lembaga | 72 |
| MPLB | Manajemen Perkantoran dan Layanan Bisnis | 72 |
| FKK | Farmasi Klinis dan Komunitas (formulir kertas: "LP. Kefarmasian Klinis dan Komunitas") **[KEPUTUSAN]** | 72 |
| TKR | Teknik Kendaraan Ringan | 108 |

---

## 3. Tujuan & KPI

| # | Tujuan | KPI |
|---|---|---|
| 1 | Daftar cepat dari HP | Median waktu isi wizard ≤ 12 menit di Android kelas menengah |
| 2 | Kurangi salah ketik data kependudukan | ≥ 85% field Akta/KK berstatus HIGH terisi benar (sampel 30 dokumen) |
| 3 | Nilai rapor terbaca otomatis | ≥ 90% nilai mapel terbaca benar dari rapor PDF digital, ≥ 75% dari foto rapor (sampel 30) |
| 4 | Rekomendasi bisa dijelaskan | 100% rekomendasi menampilkan rincian kontribusi tiap mapel |
| 5 | Data panitia terpusat | Cari & filter 2.000 pendaftar ≤ 2 detik |
| 6 | Dokumen pribadi aman | 0 berkas KK/Akta/Rapor bisa diakses tanpa login admin (test otomatis + manual) |
| 7 | Formulir resmi otomatis | PDF identik dengan formulir kertas (kop, Bagian A-D, 2 lembar tanda terima) |
| 8 | Konten & formulir dikelola sendiri | Panitia mengubah konten dan isian formulir tanpa developer |
| 9 | Performa & aksesibilitas | LCP < 2,5 dtk di 4G, CLS < 0,1, INP < 200 ms, Lighthouse a11y ≥ 95 |

---

## 4. Ruang Lingkup

### 4.1 Masuk lingkup

- Seluruh fitur publik dan admin di Bagian 10-15.
- OCR Akta, KK, dan rapor dengan engine yang bisa ditukar.
- Rekomendasi jurusan berbasis bobot nilai rapor per jurusan (aturan transparan, bukan machine learning).
- Pencarian FAQ berbasis kata kunci (tanpa AI).
- PDF formulir, rekap PDF/XLSX, email kode pendaftaran.
- Form builder dinamis.
- Penyimpanan dokumen pendaftar di Google Drive (Bagian 7.5).

### 4.2 Di luar lingkup v3

- **Login / akun siswa** (termasuk login Google).
- Tes minat & bakat, chatbot AI, metode SPK lain (SAW/TOPSIS/AHP) dan machine learning. Bisa masuk fase berikutnya; arsitektur rekomendasi dibuat sebagai service agar mudah diganti.
- Pembayaran daring.
- Integrasi Dapodik / verifikasi NISN otomatis.
- Notifikasi WhatsApp otomatis via API.
- Multi-sekolah, aplikasi mobile native.

---

## 5. Aktor & Hak Akses

| Aktor | Deskripsi | Hak akses |
|---|---|---|
| Pengunjung | Calon siswa / orang tua, **tanpa akun** | Lihat situs, isi wizard (draf bertoken), cek status |
| Pendaftar | Sudah submit, **tanpa akun** | Halaman sukses & PDF formulir lewat token, cek status (nomor + tanggal lahir) |
| Panitia (`panitia`) | Petugas SPMB | Dashboard, data pendaftar, verifikasi berkas & nilai, edit, input manual, ekspor, kuota |
| Admin konten (`konten`) | Operator situs | CRUD berita, agenda, galeri, testimoni, FAQ |
| Super admin (`superadmin`) | Ketua panitia / IT | Semua hak + pengaturan, form builder, mapel & bobot jurusan, akun admin, audit log |

Semua endpoint `/api/v1/admin/*` wajib terautentikasi (Sanctum) dan dicek peran lewat Policy/Gate.

---

## 6. Arsitektur, Tech Stack & Struktur Folder

### 6.1 Jawaban: Laravel + Framer Motion + GSAP

- **GSAP** tidak terikat framework. Bisa dipakai di Blade maupun React. Sejak 2025 seluruh plugin GSAP (ScrollTrigger, SplitText, dll.) gratis untuk penggunaan umum.
- **Framer Motion** (sekarang bernama **Motion**, paket `motion`, impor `motion/react`) adalah library **React**. Komponen `<motion.div>`, `AnimatePresence`, dan layout animation tidak bisa dipakai di Blade murni. Motion punya versi JavaScript vanilla, tapi fitur unggulannya ada di React.
- Karena itu v3 memisahkan **frontend React (Next.js)** dari **backend Laravel (API)**. Keduanya bisa dipakai berdampingan, sekaligus memenuhi keinginan struktur folder yang terpisah.

Alternatif yang dipertimbangkan (dicatat di `docs/adr/0001-arsitektur.md`):

| Opsi | Kelebihan | Kekurangan | Putusan |
|---|---|---|---|
| A. Laravel API + Next.js (terpisah) | Folder benar-benar terpisah, React penuh (Motion + GSAP), SSR untuk SEO landing, ekosistem komponen luas | Dua aplikasi untuk di-deploy, perlu konfigurasi auth SPA | **Dipilih** |
| B. Laravel + Inertia.js + React | Satu aplikasi, auth sederhana | Frontend tetap di dalam `backend/resources/js`, tidak terpisah | Cadangan bila tim kecil kesulitan deploy |
| C. Laravel Blade + Alpine (v2) | Paling sederhana | Tidak bisa Framer Motion, CSS v1 sulit dirawat | Ditolak |

### 6.2 Diagram arsitektur

```
                      Browser (HP / Laptop)
                               │ HTTPS, satu domain: spmb.smkmanu1wangon.sch.id
                      ┌────────▼─────────┐
                      │      Nginx       │
                      │  /api/*, /sanctum/*  ──► Laravel (PHP-FPM)
                      │  selain itu          ──► Next.js (Node, standalone)
                      └──────────────────┘
  ┌───────────────────────────┐        ┌──────────────────────────────────┐
  │ frontend/ (Next.js)       │ fetch  │ backend/ (Laravel 13, API only)  │
  │ - Landing SSG/ISR (SEO)   │──────► │ - REST /api/v1, Sanctum (admin)  │
  │ - Wizard (client)         │        │ - Draf wizard, validasi, submit  │
  │ - Panel admin (client)    │        │ - Rekomendasi, PDF, XLSX, Mail   │
  │ - Motion + GSAP           │        │ - Proxy lihat dokumen, audit log │
  └───────────────────────────┘        │ - Temp wizard: disk privat VPS   │
                                       └──┬─────────┬─────────┬────────┬──┘
                               pgsql SSL  │   S3 API│  Drive  │   HTTP │ + token
                                          │         │  API v3 │ (OAuth)│
                           ┌──────────────▼┐ ┌──────▼──────┐ ┌▼───────▼──┐ ┌──────────────────┐
                           │ Supabase      │ │ Supabase    │ │ Google    │ │ ocr-service/     │
                           │ PostgreSQL    │ │ Storage     │ │ Drive     │ │ FastAPI + driver │
                           │ RLS ON        │ │ konten      │ │ dokumen   │ │ engine terpilih  │
                           │               │ │ publik      │ │ pendaftar │ │                  │
                           └───────────────┘ └─────────────┘ └───────────┘ └──────────────────┘
```

Catatan diagram: panah ke ocr-service adalah HTTP internal dengan token; panah ke Google Drive memakai OAuth akun Google yang dihubungkan admin.

Prinsip:

- **Satu domain** (Nginx membagi path) sehingga cookie Sanctum tetap first-party dan tidak perlu CORS lintas domain.
- Laravel satu-satunya klien database dan storage. Browser tidak pernah memegang kunci Supabase maupun token Google.
- Dokumen siswa tidak pernah punya URL publik. File di Google Drive tidak dibagikan ke siapa pun; admin melihatnya lewat proxy Laravel.
- Kegagalan layanan sekunder (OCR, Drive, email) tidak menggagalkan pendaftaran. Selalu ada jalur isi manual.
- Validasi otoritatif ada di backend. Validasi frontend hanya untuk kenyamanan.

### 6.3 Tech stack

Versi: pakai rilis stabil terbaru saat M0, lalu kunci di `composer.lock` dan `package-lock.json`.

| Lapisan | Teknologi | Catatan |
|---|---|---|
| Backend | Laravel 13, PHP 8.3+ | Mode API (`php artisan install:api`) |
| Auth admin | Laravel Sanctum (SPA cookie) | Siswa tidak login |
| Database | Supabase PostgreSQL (driver `pgsql`) | Bagian 7 |
| Storage dokumen pendaftar | **Google Drive API v3** (`google/apiclient`), OAuth akun Google pribadi, scope `drive.file` | Bagian 7.5 |
| Storage konten publik | Supabase Storage via driver `s3` (`league/flysystem-aws-s3-v3`) | Bucket `konten-publik` |
| Storage sementara | Disk lokal privat Laravel (`storage/app/private`) | Berkas wizard sebelum submit |
| PDF | barryvdh/laravel-dompdf | Template Blade di backend (khusus PDF & email) |
| Excel | maatwebsite/excel | |
| Queue & cache | driver `database` | Email, unggah ke Google Drive, pembersihan temp |
| Frontend | Next.js (App Router) + React + TypeScript | `output: 'standalone'` |
| Styling | Tailwind CSS v4 | Token di `@theme` |
| Komponen dasar | Radix UI primitives (headless) | Gaya sendiri. Dilarang memakai tampilan default shadcn/ui apa adanya |
| Animasi UI | Motion (`motion/react`) | Transisi langkah, layout, micro-interaction |
| Animasi landing | GSAP + ScrollTrigger (+ SplitText) via `@gsap/react` | Hanya halaman publik |
| Form | React Hook Form + Zod | Skema dibangun dari form schema API |
| Data fetching | TanStack Query (admin & wizard) | Landing pakai fetch server component |
| Ikon | Phosphor Icons (`@phosphor-icons/react`) | Satu keluarga ikon |
| Grafik admin | Recharts atau Chart.js (pilih satu di M1) | |
| OCR | `ocr-service/` Python FastAPI, engine via driver | Bagian 11 |
| Testing | PHPUnit/Pest (backend), Vitest + Testing Library (frontend), Playwright (E2E), pytest (OCR) | |
| Kualitas | Laravel Pint, Larastan; ESLint + Prettier; Ruff | |

### 6.4 Struktur folder monorepo

```
spmb-v3/
├── CLAUDE.md                       # Aturan umum agen AI, rujuk docs/PRD.md
├── README.md                       # Cara menjalankan lokal
├── docs/
│   ├── PRD.md                      # Dokumen ini
│   ├── adr/                        # Architecture Decision Record (0001-arsitektur, 0002-engine-ocr, ...)
│   ├── api/openapi.yaml            # Kontrak API, sumber tipe frontend
│   └── design/DESIGN.md            # Design system hasil M1
├── backend/                        # Laravel 13, API only
│   ├── CLAUDE.md
│   ├── app/
│   │   ├── Actions/                # Satu kelas = satu use case
│   │   │   ├── Pendaftaran/        # BuatDraf, SimpanLangkah, SubmitPendaftaran
│   │   │   └── Verifikasi/         # SetujuiPendaftar, TolakPendaftar, MintaRevisi
│   │   ├── Enums/                  # StatusVerifikasi, Sumber, PeranAdmin, JenisDokumen, ConfidenceLevel
│   │   ├── Exports/                # ParticipantsExport
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/Public/   # Landing, Jurusan, Berita, Faq, Draf, Ocr, CekStatus, Sukses
│   │   │   ├── Controllers/Api/V1/Admin/    # Dashboard, Pendaftar, Dokumen, Kuota, Konten, FormField, Mapel, ...
│   │   │   ├── Middleware/
│   │   │   ├── Requests/           # FormRequest per endpoint
│   │   │   └── Resources/          # JsonResource per entitas
│   │   ├── Jobs/                   # KirimEmailKode, UnggahDokumenKeDrive, BersihkanTemp
│   │   ├── Mail/
│   │   ├── Models/
│   │   ├── Policies/
│   │   └── Services/
│   │       ├── Ocr/                # OcrClient (HTTP ke ocr-service), DTO hasil
│   │       ├── Rekomendasi/        # RekomendasiService (Bagian 12)
│   │       ├── Penyimpanan/        # PenyimpananDokumen (interface), GoogleDriveDokumen, LokalDokumen (dev/test), GoogleDriveOAuth
│   │       ├── Nomor/              # GeneratorNomorPendaftaran
│   │       ├── FormSchema/         # FormFieldConfig
│   │       └── Pdf/                # FormulirPdf, Code39Barcode
│   ├── config/
│   ├── database/{migrations,seeders,factories}/
│   ├── resources/views/{pdf,mail}/ # Blade hanya untuk PDF & email
│   ├── routes/{api.php,console.php}
│   └── tests/{Feature,Unit}/
├── frontend/                       # Next.js + React + TypeScript
│   ├── CLAUDE.md
│   ├── public/{images,fonts}/
│   └── src/
│       ├── app/
│       │   ├── (publik)/           # page.tsx (landing), jurusan/[kode], berita, cek-status
│       │   ├── (daftar)/daftar/    # langkah/[n], sukses/[token]
│       │   └── (admin)/admin/      # login, dashboard, peserta, dokumen, kuota, konten, ...
│       ├── components/
│       │   ├── ui/                 # Button, Input, Select, FileDrop, Badge, Card, Dialog, Stepper, EmptyState, Skeleton
│       │   ├── layout/             # Navbar, Footer, AdminShell
│       │   └── motion/             # Reveal, StaggerList, PageTransition (wrapper Motion), useGsap hooks
│       ├── features/               # Kode per fitur, isi: components/, hooks/, api.ts, schema.ts
│       │   ├── landing/
│       │   ├── wizard/
│       │   ├── ocr/
│       │   ├── rekomendasi/
│       │   ├── cek-status/
│       │   ├── faq/
│       │   └── admin/{dashboard,pendaftar,verifikasi,konten,form-builder,pengaturan}/
│       ├── lib/                    # api-client.ts, auth.ts, format.ts, image-compress.ts
│       ├── types/                  # Tipe hasil generate dari openapi.yaml
│       └── styles/                 # globals.css (@theme token Tailwind v4)
├── ocr-service/                    # Python FastAPI
│   ├── CLAUDE.md
│   ├── app/
│   │   ├── main.py                 # Rute /ocr/akta, /ocr/kk, /ocr/rapor, /health
│   │   ├── engines/                # base.py (interface), paddle.py, easyocr.py, tesseract.py, cloud_*.py
│   │   ├── parsers/                # akta.py, kk.py, rapor.py (tidak bergantung engine)
│   │   ├── pdf_text.py             # Ekstraksi teks PDF digital tanpa OCR
│   │   └── preprocess.py
│   ├── benchmark/                  # Skrip & dataset uji (dataset tidak di-commit)
│   ├── tests/
│   └── Dockerfile
└── infra/
    ├── docker-compose.yml          # nginx, backend, frontend, ocr, queue worker, scheduler
    ├── docker-compose.dev.yml      # + postgres lokal untuk test
    └── nginx/spmb.conf
```

Aturan perawatan:

- **Backend**: controller tipis, logika di `Actions/` dan `Services/`, validasi di `FormRequest`, output lewat `JsonResource`. Tidak ada query di controller selain pemanggilan sederhana.
- **Frontend**: kode dikelompokkan per fitur di `features/`. `components/ui` tidak boleh mengimpor dari `features/`. Komponen > 200 baris dipecah.
- **Kontrak API** di `docs/api/openapi.yaml`. Tipe TypeScript di-generate (`openapi-typescript`), bukan ditulis tangan.
- **OCR**: parser tidak tahu engine apa yang dipakai. Engine hanya mengembalikan kata + bounding box + skor.

---

## 7. Konfigurasi Supabase

### 7.1 Proyek

1. Buat proyek Supabase di region **Southeast Asia (Singapore)**.
2. Simpan Project Ref, password database, connection string pooler (salin dari dashboard, host pooler bisa berbeda per proyek).
3. **Project Settings → Data API**: matikan bila tidak dipakai. Apa pun pilihannya, RLS wajib aktif di semua tabel (7.4).

### 7.2 Koneksi database

Pakai **Session Pooler (port 5432)** untuk aplikasi dan migrasi. Transaction Pooler (6543) hanya bila menambah `PDO::ATTR_EMULATE_PREPARES => true`.

```env
DB_CONNECTION=pgsql
DB_HOST=<host-session-pooler-dari-dashboard>
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.<PROJECT_REF>
DB_PASSWORD=
DB_SSLMODE=require
```

Penyesuaian Postgres: `EXTRACT(YEAR FROM created_at)`, pencarian `ilike`, kolom JSON `jsonb`, status memakai `string` + PHP Enum (bukan `enum()`).

### 7.3 Storage konten publik (Supabase)

Supabase Storage **hanya** dipakai untuk gambar konten publik yang ukurannya kecil (cukup dalam kuota Free). Dokumen pendaftar tidak disimpan di sini (lihat 7.5).

Aktifkan **S3 Connection**, buat access key, lalu satu bucket:

| Bucket | Akses | Isi | Batas | MIME |
|---|---|---|---|---|
| `konten-publik` | Public | Hero, galeri, foto kepala sekolah, berita, agenda, testimoni, foto jurusan | 4 MB | jpeg, png, webp |

```php
// backend/config/filesystems.php
'supabase_public' => [
    'driver' => 's3',
    'key' => env('SUPABASE_S3_KEY'),
    'secret' => env('SUPABASE_S3_SECRET'),
    'region' => env('SUPABASE_S3_REGION', 'ap-southeast-1'),
    'bucket' => env('SUPABASE_BUCKET_PUBLIC', 'konten-publik'),
    'endpoint' => env('SUPABASE_S3_ENDPOINT'),
    'url' => env('SUPABASE_PUBLIC_URL'),
    'use_path_style_endpoint' => true,
    'visibility' => 'public',
    'throw' => true,
],
'dokumen_temp' => [
    'driver' => 'local',
    'root' => storage_path('app/private/draf'),
    'visibility' => 'private',
    'throw' => true,
],
```

- Gambar konten dikompres ke WebP sisi panjang maks 1.920 px sebelum diunggah.
- Kompresi dokumen di browser sebelum unggah: sisi panjang maks 2.000 px untuk rapor (agar angka tetap terbaca OCR), 1.600 px untuk lainnya, JPEG kualitas 0,85.

### 7.4 Keamanan Supabase

```sql
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
```

- Jalankan lewat migrasi terakhir. Laravel memakai role `postgres` (bypass RLS); akses anon via Data API tertolak.
- Service role key dan S3 secret hanya di `.env` backend.
- Backup: paket Pro, atau `pg_dump` terjadwal ke penyimpanan terpisah.
- Free tier: kuota database terbatas dan proyek bisa dijeda saat tidak aktif. **[KEPUTUSAN]** paket Pro selama masa pendaftaran.

### 7.5 Penyimpanan dokumen pendaftar (Google Drive)

**Keputusan v3.1:** dokumen pendaftar (Akta, KK, halaman rapor, berkas field kustom, berkas input manual admin) disimpan di **Google Drive akun Google pribadi** yang dihubungkan lewat OAuth. Gratis 15 GB.

**Perkiraan kapasitas:** 1 pendaftar ≈ 3-5 MB setelah kompresi. 300 pendaftar ≈ 1-1,5 GB per periode, sehingga 15 GB cukup untuk beberapa periode. Kuota 15 GB dipakai bersama Gmail dan Google Foto akun tersebut.

#### 7.5.1 Alur berkas

```
Wizard (sebelum submit)
  unggah → disk privat VPS: storage/app/private/draf/{draf_id}/{jenis}-{acak}.{ext}
         → OCR membaca berkas dari disk lokal
Submit berhasil
  → job UnggahDokumenKeDrive (queue, retry 5x, backoff 1, 5, 15, 60, 240 menit)
  → buat folder Drive: SPMB/{periode}/{nomor_pendaftaran} - {NAMA}/
  → unggah tiap berkas (resumable upload untuk > 5 MB), simpan file ID ke tabel pendaftar
  → setelah semua sukses: hapus salinan lokal, berkas_sinkron = selesai
  → bila gagal permanen: berkas lokal TIDAK dihapus, berkas_sinkron = gagal, admin melihat peringatan
Admin melihat dokumen
  → GET /api/v1/admin/pendaftar/{id}/dokumen/{jenis}/{index}
  → Laravel cek login & peran → ambil file dari Drive (files.get alt=media) → stream ke browser
    (bila belum tersinkron, ambil dari disk lokal) → catat audit log
```

Struktur folder di Drive:

```
SPMB/
└── 2027-2028/
    ├── SPMB-2027-0001 - AHMAD FAUZI/
    │   ├── akta.jpg
    │   ├── kk.jpg
    │   ├── rapor-1.jpg
    │   ├── rapor-2.jpg
    │   └── kustom-surat-keterangan.pdf
    └── SPMB-2027-0002 - SITI AMINAH/
```

Nama yang mudah dibaca ini disengaja agar panitia tetap bisa membuka dokumen langsung dari Google Drive bila website sedang bermasalah.

#### 7.5.2 Setup OAuth (sekali, oleh developer)

1. Google Cloud Console → buat proyek → aktifkan **Google Drive API**.
2. **OAuth consent screen**: tipe External, isi nama aplikasi "SPMB SMK Ma'arif NU 1 Wangon", scope hanya `https://www.googleapis.com/auth/drive.file` (aplikasi hanya bisa melihat file yang dibuatnya sendiri, bukan seluruh isi Drive).
3. **Publish app ke status "In production".** Di status "Testing", refresh token kedaluwarsa setelah 7 hari dan unggahan akan berhenti tanpa peringatan.
4. Buat **OAuth Client ID** tipe Web application, redirect URI `https://spmb.smkmanu1wangon.sch.id/api/v1/admin/google-drive/callback`.
5. Isi `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI` di `backend/.env`.
6. Superadmin membuka **Pengaturan → Google Drive → Hubungkan**, login dengan akun Google yang dipakai, lalu menyetujui akses.
7. Backend menyimpan refresh token **terenkripsi** di `pengaturans` (`google_drive_refresh_token`), email akun (`google_drive_email`), dan ID folder root `SPMB` (dibuat otomatis bila belum ada).

#### 7.5.3 Ketentuan

| Aspek | Ketentuan |
|---|---|
| Abstraksi | Semua akses lewat interface `PenyimpananDokumen` (`simpan`, `ambilStream`, `hapus`, `ada`). Driver: `google_drive` (produksi), `lokal` (dev & test). Pindah ke penyimpanan lain kelak cukup menambah driver, env `DOKUMEN_DRIVER` |
| Privasi | File dan folder tidak pernah dibagikan (tanpa "Anyone with the link"). Tidak ada URL Drive yang dikirim ke browser |
| Token | Refresh token terenkripsi (`Crypt`), access token di cache ≤ 50 menit. Bila token dicabut (ganti password, cabut akses), status di Pengaturan menjadi "Terputus", dashboard menampilkan peringatan, unggahan menunggu di antrean dan berkas tetap aman di disk lokal sampai akun dihubungkan ulang |
| Kuota | Dashboard admin menampilkan pemakaian Drive (`about.get storageQuota`). Peringatan kuning ≥ 80%, merah ≥ 95% |
| Rate limit | Unggah lewat queue worker tunggal, maks 3 file paralel, retry dengan exponential backoff untuk error 403 `rateLimitExceeded` / 429 / 5xx |
| Konsistensi | Kolom `berkas_sinkron` (`menunggu` / `selesai` / `gagal`). Perintah `php artisan spmb:sinkron-drive` mengulang yang gagal |
| Hapus data | Menghapus pendaftar (atau `spmb:arsip`) menghapus foldernya di Drive (pindah ke Sampah Drive, terhapus permanen otomatis setelah 30 hari) |
| Cadangan | Ekspor berkala: unduh folder `SPMB/{periode}` sebagai ZIP dari Google Drive setelah periode selesai, simpan di penyimpanan milik sekolah |
| Akun | Sementara memakai akun Google pribadi. Disarankan kelak memindahkan ke akun khusus SPMB atau akun sekolah: hubungkan akun baru di Pengaturan, jalankan `spmb:pindah-drive` (unduh dari akun lama, unggah ke akun baru, perbarui file ID). **[KEPUTUSAN]** |

---

## 8. Skema Database

Satu migrasi per tabel, bentuk final.

### 8.1 `users` (admin)

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| name | varchar(150) | |
| username | varchar(100) unique | |
| email | varchar unique nullable | |
| password | varchar | bcrypt |
| role | varchar(20) | `superadmin` / `panitia` / `konten` |
| is_active | boolean default true | |
| must_change_password | boolean default true | |
| last_login_at | timestamptz nullable | |
| remember_token, timestamps | | |

Seeder membuat satu `superadmin` dari `ADMIN_SEED_USERNAME` / `ADMIN_SEED_PASSWORD`.

### 8.2 `jurusan`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| kode | varchar(10) unique | AKL, MPLB, FKK, TKR |
| nama | varchar | |
| deskripsi | text nullable | |
| prospek_karir | jsonb nullable | Array string |
| keunggulan | jsonb nullable | Array string (pengganti `minat_terkait` untuk tampilan) |
| kuota | integer default 72 | |
| gambar | varchar nullable | Path bucket publik |
| urutan | integer default 0 | |
| is_active | boolean default true | |
| timestamps | | |

### 8.3 `mata_pelajaran` (baru v3)

Master mapel yang dibaca dari rapor dan dipakai bobot rekomendasi.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| kode | varchar(30) unique | mis. `matematika`, `ipa` |
| nama | varchar(100) | Nama tampil |
| alias | jsonb | Variasi penulisan di rapor untuk pencocokan OCR, mis. `["ilmu pengetahuan alam", "ipa"]` |
| kelompok | varchar(20) | `umum` / `madrasah` / `mulok` |
| is_active | boolean default true | |
| urutan | integer | |

Seed default di Lampiran 23.2.

### 8.4 `bobot_jurusan` (baru v3)

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| jurusan_id | FK jurusan, cascade | |
| mata_pelajaran_id | FK mata_pelajaran, cascade | |
| bobot | numeric(4,3) | 0-1. Total per jurusan disarankan 1 (dinormalisasi otomatis) |
| unique(jurusan_id, mata_pelajaran_id) | | |

### 8.5 `pendaftaran_drafts` (baru v3)

Pengganti session wizard. Siswa tidak login.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid PK | |
| token_hash | varchar(64) unique | SHA-256 dari token acak. Token asli hanya di cookie httpOnly `spmb_draft` |
| data | jsonb | `{step1: {...}, step2: {...}, ...}` terenkripsi di level aplikasi (cast `encrypted:array`) |
| langkah_terakhir | smallint | Langkah tertinggi yang lolos validasi |
| berkas | jsonb | Path disk lokal privat per jenis: `{akta, kk, rapor: [..], kustom_*}` |
| ip, user_agent | varchar | |
| expires_at | timestamptz | Default 7 hari sejak aktivitas terakhir |
| submitted_at | timestamptz nullable | |
| timestamps | | |

### 8.6 `pendaftar`

**Meta & status**

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| nomor_pendaftaran | varchar(20) unique | Bagian 10.6 |
| akses_token | varchar(64) unique | Hash token halaman sukses/formulir |
| periode | varchar(10) | mis. `2027/2028` |
| sumber | varchar(20) default `daring` | `daring` / `luring` |
| status_verifikasi | varchar(20) default `pending` | `pending` / `approved` / `rejected` / `revision` |
| status_nilai | varchar(20) default `belum_dicek` | **Baru v3**: `belum_dicek` / `sesuai` / `dikoreksi` (verifikasi nilai rapor oleh panitia) |
| catatan_verifikasi | text nullable | Tampil ke siswa |
| catatan_penolakan | varchar nullable | |
| diverifikasi_oleh | FK users nullable | |
| diverifikasi_at | timestamptz nullable | |
| notifikasi_email_at | timestamptz nullable | |
| timestamps | | |

**Bagian A, B, C, D**: sama seperti PRD v2 (Lampiran 23.6 memuat daftar lengkap kolom). Perubahan:

- Kolom `minat` **dihapus**.
- `nik`, `no_kk`, `no_hp`, `no_wa`, `no_hp_ortu` disimpan terenkripsi (`encrypted` cast) **dan** kolom hash pencarian `nik_hash`, `nisn` tetap plain untuk pencarian. **[KEPUTUSAN]** bila performa pencarian NIK lebih penting daripada enkripsi, simpan plain + masking di UI.

**Nilai rapor & rekomendasi (diubah v3)**

| Kolom | Tipe | Keterangan |
|---|---|---|
| nilai_rapor | jsonb | `{"semester": [1,2,3,4,5], "mapel": {"matematika": {"1": 82, "2": 85, ..., "rata": 84.2}, ...}}` |
| nilai_rapor_sumber | varchar(20) | `ocr` / `ocr_dikoreksi` / `manual` |
| nilai_rapor_koreksi | jsonb nullable | Daftar sel yang diubah siswa: `{mapel, semester, ocr, final}` |
| rekomendasi_jurusan_id | FK jurusan nullable | Peringkat 1 |
| rekomendasi_skor | jsonb | `{"AKL": {"skor": 84.1, "rincian": {"matematika": 37.9, ...}}, ...}` |
| rekomendasi_versi | varchar(20) | Versi bobot saat dihitung (snapshot), agar perubahan bobot tidak mengubah histori |
| jurusan_1_id, jurusan_2_id | FK jurusan nullable | Pilihan siswa |

**Berkas & kustom**

| Kolom | Tipe |
|---|---|
| akta_file_id, kk_file_id | varchar nullable (file ID Google Drive) |
| rapor_file_ids | jsonb (array file ID, rapor bisa beberapa halaman/semester) |
| kustom_file_ids | jsonb nullable (`{kustom_xxx: file_id}`) |
| drive_folder_id | varchar nullable |
| berkas_lokal | jsonb nullable (path disk lokal selama belum tersinkron) |
| berkas_meta | jsonb nullable (nama asli, MIME, ukuran per berkas, untuk tampilan admin tanpa memanggil Drive) |
| berkas_sinkron | varchar(10) default `menunggu` (`menunggu` / `selesai` / `gagal`) |
| data_kustom | jsonb nullable |

**Indeks**: unique `nomor_pendaftaran`, `akses_token`; index `status_verifikasi`, `status_nilai`, `jurusan_1_id`, `periode`, `created_at`, `nisn`, `nik_hash`; `pg_trgm` + GIN pada `nama_lengkap`.

### 8.7 `ocr_hasil` (baru v3)

Menyimpan hasil OCR untuk audit dan benchmark engine. **Gambar tidak disimpan di sini.**

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| draft_id | uuid FK nullable | |
| pendaftar_id | FK nullable | Diisi saat submit |
| jenis | varchar(10) | `akta` / `kk` / `rapor` |
| engine | varchar(30) | mis. `paddleocr`, `easyocr`, `pdf_text` |
| engine_versi | varchar(30) | |
| fields | jsonb | Hasil terstruktur |
| confidence | jsonb | Per field |
| durasi_ms | integer | |
| sukses | boolean | |
| created_at | | |

Teks mentah OCR tidak disimpan permanen (mengandung data pribadi); hanya dikirim ke browser untuk diagnosis selama wizard.

### 8.8 Konten, pengaturan, form builder, audit

Sama seperti PRD v2:

- `faqs` (pertanyaan, jawaban, keywords jsonb, kategori, urutan, is_active)
- `beritas` (judul, slug, isi HTML tersanitasi, gambar, is_active, published_at)
- `events` (judul, slug, deskripsi, tanggal, lokasi, gambar, is_active)
- `galeris`, `testimonis`
- `pengaturans` key-value dengan cache
- `form_fields` (kunci, langkah, label, teks_bantuan, tipe, opsi, placeholder, nilai_default, tampil, wajib, urutan, is_kustom)
- `audit_logs` (user_id, aksi, entitas_tipe, entitas_id, data_lama, data_baru, ip, user_agent, created_at)
- Tabel bawaan Laravel: `sessions` (admin), `cache`, `jobs`, `failed_jobs`, `personal_access_tokens` (tidak dipakai bila SPA cookie, boleh dibiarkan).

### 8.9 Relasi

```
jurusan 1──* bobot_jurusan *──1 mata_pelajaran
jurusan 1──* pendaftar (jurusan_1_id, jurusan_2_id, rekomendasi_jurusan_id)
pendaftaran_drafts 1──1 pendaftar (setelah submit)
pendaftaran_drafts 1──* ocr_hasil ; pendaftar 1──* ocr_hasil
users 1──* pendaftar (diverifikasi_oleh) ; users 1──* audit_logs
```

---

## 9. Kontrak API

Prefix `/api/v1`. JSON. Error format seragam:

```json
{ "message": "Data tidak valid.", "errors": { "nik": ["NIK harus 16 digit."] }, "code": "VALIDATION_ERROR" }
```

### 9.1 Publik

| Method | Endpoint | Fungsi | Throttle |
|---|---|---|---|
| GET | `/landing` | Data landing sekaligus (jurusan, berita, agenda, galeri, testimoni, FAQ, pengaturan publik) | 60/mnt |
| GET | `/jurusan`, `/jurusan/{kode}` | Daftar & detail jurusan + sisa kuota | 60/mnt |
| GET | `/berita`, `/berita/{slug}` | Arsip & detail berita | 60/mnt |
| GET | `/faq?q=` | Pencarian FAQ (Bagian 10.8) | 30/mnt |
| GET | `/form-schema` | Konfigurasi isian wizard per langkah (Bagian 14) | 60/mnt |
| GET | `/mapel` | Mapel aktif untuk tabel nilai rapor | 60/mnt |
| POST | `/draf` | Buat draf, set cookie `spmb_draft` | 10/mnt |
| GET | `/draf` | Ambil isi draf (berdasar cookie) | 60/mnt |
| PUT | `/draf/langkah/{n}` | Validasi & simpan langkah n | 30/mnt |
| POST | `/draf/berkas/{jenis}` | Unggah berkas (`akta`, `kk`, `rapor`, `kustom_*`) ke temp | 20/mnt |
| DELETE | `/draf/berkas/{jenis}/{index?}` | Hapus berkas temp | 20/mnt |
| POST | `/draf/ocr/{jenis}` | Jalankan OCR untuk berkas yang sudah diunggah | 10/mnt |
| GET | `/draf/rekomendasi` | Hitung rekomendasi dari nilai di draf | 30/mnt |
| POST | `/draf/submit` | Submit final (header `Idempotency-Key`) | 5/mnt |
| DELETE | `/draf` | Mulai ulang (hapus draf & berkas temp) | 10/mnt |
| GET | `/ocr/health` | Status layanan OCR | 30/mnt |
| GET | `/sukses/{token}` | Ringkasan pendaftar | 30/mnt |
| GET | `/formulir/{token}` | Unduh PDF formulir | 10/mnt |
| POST | `/cek-status` | Body `{nomor, tanggal_lahir}` | 10/mnt |

### 9.2 Admin (Sanctum SPA cookie)

| Method | Endpoint |
|---|---|
| GET | `/sanctum/csrf-cookie` |
| POST | `/admin/login`, `/admin/logout` |
| GET | `/admin/me` |
| PUT | `/admin/me/password` |
| GET | `/admin/dashboard` |
| GET | `/admin/pendaftar` (cari, filter, sort, paginasi, `?export=xlsx\|pdf`) |
| GET/PUT | `/admin/pendaftar/{id}` |
| POST | `/admin/pendaftar/manual` |
| POST | `/admin/pendaftar/{id}/approve`, `/reject`, `/revisi` |
| POST | `/admin/pendaftar/{id}/nilai/verifikasi` (status_nilai + koreksi) |
| GET | `/admin/pendaftar/{id}/dokumen` (daftar berkas + meta + status sinkron) |
| GET | `/admin/pendaftar/{id}/dokumen/{jenis}/{index?}` (stream dari Drive / disk lokal + audit; `?unduh=1` untuk unduh) |
| GET | `/admin/pendaftar/{id}/formulir` (PDF) |
| GET | `/admin/ekspor/xlsx` |
| GET/PUT | `/admin/kuota` |
| CRUD | `/admin/jurusan`, `/admin/mapel`, `/admin/jurusan/{id}/bobot` |
| CRUD | `/admin/berita`, `/admin/event`, `/admin/galeri`, `/admin/testimoni`, `/admin/faq` |
| CRUD | `/admin/form-field` + `POST /admin/form-field/urutan`, `POST /admin/form-field/{id}/toggle` |
| GET/PUT | `/admin/pengaturan` |
| GET | `/admin/google-drive/status` (terhubung/terputus, email, kuota) |
| GET | `/admin/google-drive/hubungkan` (redirect OAuth, superadmin) |
| GET | `/admin/google-drive/callback` |
| POST | `/admin/google-drive/putuskan`, `/admin/google-drive/uji` (tulis-baca-hapus file kecil), `/admin/google-drive/sinkron-ulang` |
| CRUD | `/admin/users` (superadmin) |
| GET | `/admin/audit` (superadmin) |
| GET | `/admin/ocr/statistik` (akurasi & durasi per engine dari `ocr_hasil`) |

Konfigurasi Sanctum: `SANCTUM_STATEFUL_DOMAINS=spmb.smkmanu1wangon.sch.id`, `SESSION_DOMAIN` sama, cookie `secure` + `SameSite=Lax`.

---

## 10. Fitur Publik & Wizard Pendaftaran

### 10.1 Layout publik

- Navbar: logo, Beranda, Jurusan, Alur Daftar, Berita, FAQ, Cek Status, tombol "Daftar Sekarang". Mobile: menu layar penuh.
- Footer: identitas sekolah, kontak, tautan cepat, tautan login admin kecil.
- Widget "Tanya Panitia" (pencarian FAQ) di kanan bawah.
- Tahun ajaran dari pengaturan `tahun_ajaran`.

### 10.2 Landing (`/`)

Dirender server (SSG + revalidate 5 menit atau on-demand revalidation saat admin menyimpan konten).

| Section | Isi wajib |
|---|---|
| Hero | Judul, subjudul ≤ 20 kata, CTA Daftar + Cek Status, foto asli sekolah, info gelombang aktif |
| Sambutan | Foto kepala sekolah, kutipan singkat |
| Program keahlian | 4 jurusan, menuju `/jurusan/{kode}` |
| Alur pendaftaran | Langkah ringkas, termasuk "unggah rapor, dapat rekomendasi jurusan" |
| Berita & agenda | 3 berita, 3 agenda |
| Galeri | 8 foto |
| Testimoni alumni | 6 testimoni |
| FAQ | 6 pertanyaan |

Kriteria terima: konten nonaktif tidak tampil; section kosong disembunyikan atau tampil empty state; hero admin dipakai bila ada.

### 10.3 Detail jurusan (`/jurusan/[kode]`)

Kode tidak peka huruf. Tidak ada / nonaktif → 404. Isi: nama, deskripsi, prospek karier, keunggulan, **mapel yang paling berpengaruh untuk rekomendasi** (dari `bobot_jurusan`), daya tampung (kuota, terdaftar pilihan 1, sisa), CTA daftar.

### 10.4 Wizard 8 langkah (`/daftar/langkah/[n]`)

**Mekanisme umum**

- Tanpa login. Saat pertama membuka wizard, frontend memanggil `POST /draf`; backend membuat draf dan cookie httpOnly `spmb_draft` (7 hari).
- Setiap "Lanjut" memanggil `PUT /draf/langkah/{n}`. Backend memvalidasi dengan aturan + form builder, menyimpan ke `data`, memperbarui `langkah_terakhir`.
- Gerbang langkah: frontend menolak membuka langkah > `langkah_terakhir + 1`; backend juga menolak menyimpan langkah yang prasyaratnya belum ada.
- Siswa bisa menutup browser dan melanjutkan di perangkat yang sama selama draf belum kedaluwarsa. Tombol "Mulai ulang" menghapus draf.
- `localStorage` hanya untuk preferensi UI (mis. langkah terakhir dilihat), **bukan data pribadi**.
- Stepper "Langkah X dari 8 · Nama langkah", sticky di mobile. Tombol Kembali tanpa kehilangan isian.
- Transisi antar langkah dengan Motion (geser + fade ≤ 250 ms), nonaktif saat `prefers-reduced-motion`.

**Langkah 1 · Persetujuan & identitas awal**

| Field | Aturan |
|---|---|
| nama_lengkap | required, min 3, max 255 |
| nisn | required, digits:10 |
| tanggal_lahir | required, date, before:today (dipakai untuk cek status & pencocokan Akta) |
| setuju | required, accepted |

Tampilkan persyaratan, jadwal, dan teks persetujuan UU PDP (tujuan pengumpulan data, penyimpanan, kontak sekolah). Di luar jadwal gelombang, wizard tertutup dengan pesan jadwal berikutnya.

**Langkah 2 · Akta & KK + OCR**

- Dua slot unggah (kamera HP via `capture="environment"`), jpg/png/webp/pdf ≤ 5 MB. Wajib/opsional sesuai form builder **[KEPUTUSAN]**.
- Setelah unggah: pratinjau → `POST /draf/ocr/{akta|kk}` → kartu hasil yang bisa diedit dengan lencana keyakinan (Tinggi / Perlu dicek). Status proses dengan skeleton + teks ("Membaca dokumen..."), `aria-live`.
- Aturan isi otomatis: HIGH terisi + lencana hijau; MEDIUM terisi + lencana kuning; LOW/NOT_FOUND kosong.
- Nama & TTL hanya dari Akta. NIK siswa dari anggota KK yang namanya paling mirip nama Langkah 1. Bila nama Akta berbeda jauh dari nama Langkah 1, tampilkan peringatan.
- Hasil mengisi draf langkah 5 dan 6 (nama, tempat/tanggal lahir, jenis kelamin, NIK, no KK, alamat, nama & pekerjaan ortu).
- OCR mati / gagal: pesan ramah, lanjut isi manual.

**Langkah 3 · Rapor + OCR nilai (wajib)**

- Unggah rapor SMP/MTs. Bisa beberapa berkas (satu per semester atau satu PDF berisi semua halaman), maks 10 berkas, masing-masing ≤ 5 MB.
- Semester yang dipakai: default **semester 1-5** **[KEPUTUSAN]**, diatur di pengaturan `semester_rapor`.
- Proses: `POST /draf/ocr/rapor` → backend mengirim berkas ke ocr-service → hasil berupa tabel mapel × semester.
- UI menampilkan **tabel nilai yang bisa diedit**: baris = mapel aktif, kolom = semester, kolom terakhir rata-rata otomatis. Sel hasil OCR ber-confidence rendah diberi tanda kuning. Sel yang diubah siswa diberi penanda "diubah".
- Validasi: nilai 0-100, semua mapel yang punya bobot di jurusan mana pun wajib terisi minimal di satu semester. Mapel di rapor yang tidak dikenali ditampilkan di bagian "Tidak dikenali" agar siswa bisa memetakannya ke mapel yang benar.
- Bila OCR gagal total: siswa mengisi tabel manual (`nilai_rapor_sumber = manual`). Berkas rapor tetap wajib diunggah sebagai bukti.
- Pernyataan di bawah tabel: "Nilai akan dicocokkan panitia dengan rapor asli saat verifikasi berkas."

**Langkah 4 · Rekomendasi & pilihan jurusan**

- `GET /draf/rekomendasi` → kartu 4 jurusan diurutkan skor (Bagian 12), masing-masing menampilkan skor, label, dan rincian kontribusi mapel (bar horizontal).
- Animasi masuk kartu (stagger Motion) dan bar mengisi dari 0.
- Rekomendasi bersifat saran. Siswa bebas memilih.

| Field | Aturan |
|---|---|
| jurusan_1 | required, exists, jurusan aktif |
| jurusan_2 | nullable, exists, different:jurusan_1 |

Bila jurusan pilihan kuotanya sudah penuh, tampilkan info (tidak memblokir, keputusan akhir di panitia).

**Langkah 5 · Data murid (Bagian A)** · **Langkah 6 · Data orang tua (A14-15)** · **Langkah 7 · Bagian B, C, D**

Field dan aturan sama dengan PRD v2 Bagian 9.4 (Lampiran 23.6), dengan perubahan:

- Field yang sudah terisi OCR ditandai ikon kecil "dari dokumen".
- Checkbox "No. WhatsApp sama dengan No. HP" dan "Alamat orang tua sama dengan alamat murid".
- `email` default **opsional** **[KEPUTUSAN]**. Bila kosong, kode pendaftaran hanya tampil di halaman sukses dan PDF.
- Nilai ujian Bagian B tetap diisi manual (bukan dari OCR rapor).

**Langkah 8 · Tinjau & kirim**

- Ringkasan per bagian dengan tautan "Ubah", termasuk tabel nilai rapor dan rekomendasi.
- `konfirmasi_final` wajib.
- Tombol kirim nonaktif saat proses + `Idempotency-Key`.

### 10.5 Proses submit (backend, `SubmitPendaftaran`)

Dalam satu transaksi database:

1. Validasi ulang seluruh draf (aturan + form builder).
2. Hitung ulang rekomendasi di server (jangan percaya nilai dari klien), simpan skor, rincian, dan `rekomendasi_versi`.
3. Buat nomor pendaftaran (10.6) dan token akses acak 40 karakter (simpan hash).
4. Simpan baris `pendaftar` (`pending`, `daring`, periode aktif), kaitkan `ocr_hasil` ke pendaftar.
5. Tandai draf `submitted_at`.

Setelah commit:

6. Job `UnggahDokumenKeDrive`: unggah berkas dari disk lokal ke `SPMB/{periode}/{nomor} - {NAMA}/` di Google Drive (Bagian 7.5.1). Gagal tidak membatalkan pendaftaran; berkas tetap di disk lokal.
7. Email kode pendaftaran (job) bila email ada.
8. Hapus cookie draf, respons berisi token → frontend ke `/daftar/sukses/[token]`.

### 10.6 Nomor pendaftaran

- Format default `SPMB-{TAHUN}-{NNNN}` **[KEPUTUSAN: SPMB atau PPDB]**, `{TAHUN}` = tahun pertama `tahun_ajaran`.
- Dibuat di dalam transaksi dengan `pg_advisory_xact_lock(hashtext('nomor_' || tahun))`, nomor = maks yang ada + 1. Unique constraint sebagai pengaman terakhir (retry sekali).

### 10.7 Halaman sukses (`/daftar/sukses/[token]`)

Nomor besar + tombol salin, ringkasan (nama, NISN, pilihan 1 & 2, rekomendasi), CTA grup WhatsApp bila ada, unduh PDF formulir, cetak halaman (stylesheet print), daftar berkas fisik (Lampiran 23.4). Peringatan: "Simpan nomor pendaftaran dan tautan halaman ini."

### 10.8 Tanya Panitia (pencarian FAQ, bukan AI)

- Widget mengambang dengan tombol cepat (Persyaratan, Jadwal, Cara Upload, Jurusan, Rekomendasi).
- `GET /faq?q=`: lowercase, buang non-alfanumerik dan stopword (Lampiran 23.5), skor Jaccard antara kata kueri dan (keywords + kata pertanyaan). Jawab bila skor tertinggi ≥ 0,1, sertakan 2-3 pertanyaan terkait.
- Fallback: "Maaf, jawabannya belum ada. Hubungi panitia di {kontak_panitia} atau datang ke sekolah."

### 10.9 Cek status (`/cek-status`)

Input nomor + tanggal lahir, throttle 10/menit per IP. Hasil: nama, jurusan 1 & 2, status (Menunggu Verifikasi biru, Diterima hijau, Perlu Revisi kuning, Ditolak merah), catatan panitia. Pesan galat sama untuk nomor salah dan tanggal salah (tidak membocorkan nomor mana yang ada).

---

## 11. Fitur Cerdas: OCR (KK, Akta, Rapor)

OCR adalah satu-satunya fitur cerdas di v3. **Engine belum ditetapkan**, sehingga arsitektur wajib bisa menukar engine tanpa mengubah parser, backend, maupun frontend.

### 11.1 Arsitektur

```
frontend: unggah → kompresi → POST /api/v1/draf/berkas/{jenis}
          → POST /api/v1/draf/ocr/{jenis}
backend:  ambil berkas dari disk lokal privat → multipart ke OCR_SERVICE_URL/ocr/{jenis}
          (header X-OCR-Token, timeout 90 dtk) → simpan ocr_hasil → kembalikan fields + confidence
ocr-service:
   1. Bila PDF dengan lapisan teks (mis. ekspor e-Rapor) → pdf_text.py (tanpa OCR, akurasi ~100%)
   2. Selain itu → preprocess (deskew, CLAHE, denoise) → ENGINE.recognize() → [kata, bbox, skor]
   3. Parser sesuai jenis: akta.py / kk.py / rapor.py → fields + confidence HIGH/MEDIUM/LOW/NOT_FOUND
```

Interface engine (Python):

```python
class OcrEngine(Protocol):
    name: str
    version: str
    def recognize(self, image: np.ndarray) -> list[Word]: ...      # Word: text, bbox, score
    def recognize_table(self, image: np.ndarray) -> Table | None: ...  # opsional, untuk rapor
```

Engine dipilih lewat env `OCR_ENGINE` (dan `OCR_ENGINE_RAPOR` bila rapor memakai engine berbeda).

### 11.2 Endpoint ocr-service

| Endpoint | Input | Output |
|---|---|---|
| `POST /ocr/akta` | file | fields (nama, tempat_lahir, tanggal_lahir, jenis_kelamin, nama_ayah, nama_ibu) + confidence |
| `POST /ocr/kk` | file, `nama_target` | fields (no_kk, alamat terurai, nama & pekerjaan ayah/ibu) + members + matched_nik |
| `POST /ocr/rapor` | file[] , `mapel` (kode + alias dari backend), `semester` | `{mapel: {kode: {semester: nilai, conf}}, tidak_dikenali: [...], meta: {nama_siswa, nisn, sekolah}}` |
| `GET /health` | | `{status, engine, version}` |

### 11.3 Aturan bisnis

**Akta & KK** (dipertahankan dari v1):

- Nama & TTL siswa hanya dari Akta. NIK siswa dari baris anggota KK yang namanya paling mirip nama siswa, bukan NIK pertama.
- Nomor KK dan NIK dibedakan dari label dan posisi header. Tanggal lahir dipilih dari konteks ("lahir", tahun wajar).
- Tidak menebak. Field ragu = MEDIUM/LOW.

**Rapor** (baru v3):

- Pencocokan nama mapel: normalisasi (lowercase, buang tanda baca & kata "dan budi pekerti" dsb.), cocokkan ke `alias` dengan fuzzy match (rasio ≥ 0,85 = HIGH, 0,7-0,85 = MEDIUM).
- Nilai: angka 0-100 di kolom "Nilai Akhir" / "Nilai" / "Pengetahuan". Bila rapor K13 punya kolom Pengetahuan & Keterampilan, ambil Pengetahuan **[KEPUTUSAN]**. Abaikan kolom predikat (A/B/C) dan deskripsi.
- Semester dideteksi dari teks header ("Semester 1 / Ganjil", "Kelas VII"). Bila gagal, siswa memilih semester per berkas di UI.
- Validasi silang: bila NISN/nama di rapor terbaca dan berbeda dengan Langkah 1, tampilkan peringatan (tidak memblokir).
- Hasil selalu dikonfirmasi siswa dan diverifikasi panitia (Bagian 13.4). OCR rapor tidak pernah langsung dianggap final.

### 11.4 Kandidat engine & spike pemilihan **[KEPUTUSAN]**

| Engine | Jenis | Kekuatan | Kelemahan | Privasi data |
|---|---|---|---|---|
| PaddleOCR 3.x (PP-OCRv5, PP-StructureV3 untuk tabel) | Self-hosted, gratis | Akurasi teks Latin baik, ada pengenalan tabel (cocok rapor) | Lebih berat, setup lebih rumit | Data tetap di server sekolah |
| EasyOCR (dipakai v1) | Self-hosted, gratis | Parser KK/Akta v1 sudah ada, setup mudah | Tidak ada pengenalan tabel, lambat di CPU | Tetap di server |
| Tesseract 5 | Self-hosted, gratis | Ringan | Lemah untuk foto HP miring/buram | Tetap di server |
| Google Cloud Vision / Document AI | Cloud, berbayar per halaman | Akurasi tinggi, cepat | Biaya, data KK dikirim ke pihak ketiga | Perlu dasar hukum & persetujuan (UU PDP) |
| Azure AI Document Intelligence (Layout) | Cloud, berbayar | Ekstraksi tabel sangat baik | Biaya, data ke pihak ketiga | Sama |
| Model vision LLM (Claude, Gemini, dll.) dengan output JSON | Cloud, berbayar per token | Paling tahan terhadap format rapor yang beragam | Biaya, perlu pembatasan prompt, data ke pihak ketiga | Sama |

Rekomendasi awal: **PaddleOCR self-hosted** sebagai kandidat utama (gratis, data tidak keluar, punya pengenalan tabel), **EasyOCR** sebagai baseline karena parser v1 sudah ada, dan **satu engine cloud** sebagai pembanding. Keputusan final dari hasil spike.

**Spike M5a (3-5 hari):**

1. Kumpulkan dataset uji anonim dengan izin: 20 Akta, 20 KK, 20 rapor (campuran PDF digital e-Rapor, scan, foto HP). Dataset tidak masuk repo.
2. Buat ground truth manual (`benchmark/truth/*.json`).
3. Jalankan `benchmark/run.py --engine <nama>` untuk tiap kandidat.
4. Ukur: akurasi per field, akurasi nilai rapor per sel, persentase HIGH yang benar (presisi), durasi p50/p95 di VPS target, RAM, biaya per 1.000 dokumen.
5. Kriteria lolos: presisi HIGH ≥ 95%, akurasi nilai rapor foto ≥ 75%, p95 ≤ 20 dtk per dokumen di CPU, biaya sesuai anggaran sekolah.
6. Tulis `docs/adr/0002-engine-ocr.md` berisi hasil dan keputusan.

### 11.5 Ketentuan umum

- URL & token dari env (`OCR_SERVICE_URL`, `OCR_SERVICE_TOKEN`). ocr-service tidak terbuka ke internet (jaringan internal Docker).
- Gambar diproses di memori, tidak disimpan oleh ocr-service.
- Engine cloud (bila dipilih) hanya dipanggil dari ocr-service, kunci API hanya di server, dan teks persetujuan Langkah 1 menyebut pemrosesan oleh pihak ketiga.
- Frontend memanggil `/ocr/health` saat membuka Langkah 2-3. Bila mati: sembunyikan tombol OCR, tampilkan isian manual.

---

## 12. Rekomendasi Jurusan dari Nilai Rapor

Rekomendasi **hanya memakai nilai rapor** yang telah dikonfirmasi siswa. Metode: **pembobotan rata-rata tertimbang (weighted scoring)** per jurusan. Sederhana, bisa dijelaskan ke orang tua dan guru BK, dan bobotnya bisa diubah admin. Ini bukan machine learning; bila kelak diganti metode lain (mis. SAW/TOPSIS), cukup mengganti `RekomendasiService`.

### 12.1 Rumus

```
n_k   = rata-rata nilai mapel k dari semester yang dipakai (abaikan semester kosong)
w_jk  = bobot mapel k untuk jurusan j (bobot_jurusan)
K_j   = mapel berbobot untuk jurusan j yang nilainya tersedia

skor_j     = Σ_{k∈K_j} (w_jk × n_k) / Σ_{k∈K_j} w_jk          → rentang 0-100
kontribusi_jk = (w_jk / Σ_{k∈K_j} w_jk) × n_k                  → untuk bar rincian
```

- Bila mapel berbobot tidak ada di rapor (mis. Informatika tidak diajarkan), bobotnya **dibagi ulang secara proporsional** ke mapel lain (sudah tercakup oleh pembagi di atas). Bila lebih dari 50% total bobot jurusan hilang, tandai "Data kurang".
- Pembulatan 1 desimal saat tampil, simpan 2 desimal.

### 12.2 Peringkat & label

Skor absolut cenderung mirip antarjurusan untuk siswa bernilai rata, jadi label memakai **posisi relatif**:

| Kondisi | Label | Warna |
|---|---|---|
| Skor tertinggi | Paling Sesuai | hijau |
| Selisih ≤ 3 poin dari tertinggi | Juga Sesuai | hijau muda |
| Lainnya | Alternatif | abu-abu |
| > 50% bobot tanpa data | Data Kurang | kuning |

Seri skor: urutkan berdasarkan nilai mapel berbobot terbesar jurusan tersebut, lalu urutan jurusan.

Selain label, UI menampilkan kalimat penjelas otomatis, mis. "Nilai Matematika (88) dan IPS (85) kamu paling mendukung AKL."

### 12.3 Bobot default (usulan, wajib disetujui guru BK) **[KEPUTUSAN]**

| Jurusan | Bobot mapel |
|---|---|
| AKL | matematika 0,40 · ips 0,25 · b_indonesia 0,15 · informatika 0,10 · b_inggris 0,10 |
| MPLB | b_indonesia 0,30 · ips 0,25 · b_inggris 0,20 · informatika 0,15 · matematika 0,10 |
| FKK | ipa 0,45 · matematika 0,20 · b_indonesia 0,15 · b_inggris 0,10 · pai 0,10 |
| TKR | ipa 0,35 · matematika 0,30 · prakarya 0,20 · informatika 0,15 |

Admin superadmin dapat mengubah bobot di panel (Bagian 13.9). Setiap perubahan menaikkan `rekomendasi_versi`; skor pendaftar lama tidak berubah.

### 12.4 Kriteria terima

- Matematika 90, IPS 86, B. Indonesia 80, IPA 70, lainnya 75 → AKL "Paling Sesuai".
- IPA 92, Matematika 85, lainnya 75 → FKK atau TKR di peringkat 1-2, AKL bukan peringkat 1.
- Rapor tanpa Informatika → skor tetap dihitung dengan bobot dibagi ulang, tidak error.
- Skor yang dihitung backend saat submit sama dengan yang tampil di Langkah 4 untuk data yang sama.
- Perubahan bobot tidak mengubah `rekomendasi_skor` pendaftar yang sudah submit.

---

## 13. Panel Admin

Frontend: `/admin/*` (Next.js, client). Layout: sidebar desktop / drawer mobile, header nama admin + keluar. Kepadatan tinggi, angka `tabular-nums`, animasi minimal.

| Grup | Menu |
|---|---|
| Utama | Dashboard, Data Peserta, Verifikasi |
| Aksi | Ekspor XLSX, Kuota, Input Manual |
| Konten | Berita, Agenda, Galeri, Testimoni, FAQ |
| Sistem | Jurusan & Bobot, Mata Pelajaran, Isian Formulir, Pengaturan, Statistik OCR, Akun Admin, Audit Log |

### 13.1 Login

Username + password, throttle 5/menit, "Ingat saya", wajib ganti password saat `must_change_password`. Audit `login`.

### 13.2 Dashboard

Kartu: Total, Menunggu, Diterima, Revisi/Ditolak, **Nilai belum dicek**. Banner peringatan bila Google Drive terputus, kuota ≥ 80%, atau ada berkas `gagal` sinkron. Distribusi kuota per jurusan (progress bar). Grafik pendaftar per hari (periode aktif), per status, per jurusan pilihan 1, **sebaran jurusan rekomendasi vs pilihan siswa**. Tabel 8 pendaftar terbaru. Data contoh hanya di `APP_ENV=local`.

### 13.3 Data Peserta

Cari (nama, NISN, nomor, asal sekolah, NIK via hash, no HP), filter (status, status nilai, jurusan, sumber, periode, tanggal, kelengkapan berkas), sort kolom, paginasi 20, ekspor hasil filter (XLSX/PDF). NIK & HP dimasking di tabel.

### 13.4 Verifikasi

Satu halaman per pendaftar dengan dua panel:

- **Kiri**: penampil dokumen (Akta, KK, tiap halaman rapor, berkas kustom) yang di-stream lewat backend dari Google Drive. Gambar: zoom, rotasi, layar penuh. PDF: penampil PDF bawaan browser. Tombol unduh per berkas. Bila berkas belum tersinkron, ditampilkan dari disk lokal dengan label "Menunggu unggah ke Drive".
- **Kanan**: data hasil isian; untuk rapor, tabel nilai dengan penanda sel hasil OCR, sel dikoreksi siswa (nilai OCR vs final), dan sel ber-confidence rendah.
- Aksi nilai: "Nilai sesuai" (`status_nilai = sesuai`) atau koreksi sel → rekomendasi dihitung ulang, `status_nilai = dikoreksi`, audit log.
- Aksi pendaftar: Setujui, Perlu Revisi (catatan wajib), Tolak (alasan). Catat `diverifikasi_oleh/at`. Email status opsional **[KEPUTUSAN]**.
- Navigasi "Berikutnya" ke pendaftar `pending` selanjutnya.

### 13.5 Detail & edit pendaftar

Panel: Kontak (tautan `wa.me`, nomor `08xx` → `62xx`, WA fallback ke HP), Identitas, Orang Tua, Bagian B-D, Nilai Rapor & Rekomendasi (rincian kontribusi), Pilihan Jurusan, Berkas, Field Kustom, Status, Riwayat (audit). Edit semua kolom teks + ganti berkas, audit data lama/baru. ID tidak ada → 404.

### 13.6 Kuota

Tabel jurusan (kuota input 0-1000, terdaftar, sisa, persen), simpan massal dalam transaksi.

### 13.7 Input manual (luring)

Satu form (Bagian A-D + tabel nilai rapor + unggah berkas opsional), `sumber = luring`, status default `approved`, nomor dari generator yang sama, rekomendasi dihitung bila nilai diisi.

### 13.8 Konten

CRUD berita (editor teks kaya, HTML disanitasi), agenda, galeri, testimoni, FAQ (keywords dipisah koma). Gambar ke bucket publik, gambar lama dihapus saat diganti/dihapus. Simpan konten memicu revalidasi landing.

### 13.9 Jurusan, mapel & bobot (baru v3, superadmin)

- CRUD jurusan (nama, deskripsi, prospek, keunggulan, kuota, foto, urutan, aktif).
- CRUD mata pelajaran + alias (satu baris satu alias).
- Editor bobot per jurusan: slider/angka per mapel, total ditampilkan, tombol "Normalisasi ke 1". **Pratinjau**: masukkan contoh nilai, lihat skor 4 jurusan sebelum menyimpan.

### 13.10 Pengaturan

Tahun ajaran (`^\d{4}/\d{4}$`), jadwal gelombang (buka/tutup), tanggal verifikasi berkas fisik, semester rapor yang dipakai, kontak panitia, teks persyaratan & persetujuan, gambar hero/galeri kegiatan/kepala sekolah, tautan grup WA, **Google Drive** (tombol Hubungkan/Putuskan, email akun terhubung, pemakaian kuota, uji koneksi, jumlah berkas menunggu/gagal + tombol Sinkron ulang).

### 13.11 Statistik OCR (baru v3)

Dari `ocr_hasil`: jumlah per jenis & engine, tingkat sukses, durasi p50/p95, persentase sel rapor yang dikoreksi siswa/panitia (indikator akurasi nyata).

---

## 14. Form Builder Dinamis

Sama seperti PRD v2 Bagian 13, disesuaikan ke arsitektur API:

- Backend menyajikan `GET /form-schema` (cache, dibersihkan saat admin menyimpan): langkah → field (kunci, label, tipe, opsi, wajib, tampil, urutan, teks bantuan, placeholder, default).
- Frontend merender field secara dinamis dan membangun skema Zod dari form schema. Backend tetap memvalidasi dengan `FormFieldConfig::sesuaikanAturan()` + `aturanKustom()`.
- Field bawaan: kunci terkunci, tidak bisa dihapus, hanya disembunyikan/diwajibkan/dilabel ulang. Opsi berkode (penghasilan 01-05) hanya bisa diganti label.
- Field kustom: kunci `kustom_{slug}`, tipe text/number/tel/email/date/textarea/select/radio/checkbox/file. Berkas kustom ikut dipindah saat submit. Jawaban masuk `data_kustom`, detail pendaftar, dan ekspor XLSX.
- Field `rapor` dan tabel nilai **tidak bisa dimatikan** selama rekomendasi aktif (dikunci di form builder dengan keterangan).
- Seed field bawaan: Lampiran 23.3.

---

## 15. Dokumen Keluaran

### 15.1 PDF formulir (`/formulir/{token}`, backend DomPDF)

Kertas F4 portrait (210 × 330 mm). Meniru formulir kertas resmi: kop, judul + tahun pelajaran, No. Pendaftaran + barcode Code 39, Bagian A 1-17, B (termasuk nilai ujian angka & terbilang), C, D, blok tanda tangan + kotak foto 3×4, dua lembar **Tanda Terima Berkas** (8 berkas, tanggal datang dari pengaturan, "PANITIA SPMB"). Nama berkas `formulir-pendaftaran-{nomor}.pdf`.

### 15.2 Ekspor XLSX

Sheet "Data Pendaftar", header hijau `#057A3C` teks putih tebal, auto-size. Semua kolom Bagian A-D, alamat terurai, nilai rapor rata-rata per mapel, sumber nilai, status nilai, skor & jurusan rekomendasi, pilihan 1 & 2, status, sumber, tanggal, kolom kustom. NIK/NISN/HP format teks.

### 15.3 Rekap PDF

A4 landscape, kop, judul + periode + filter, tabel, nomor halaman, tanda tangan panitia.

### 15.4 Email kode pendaftaran

Subjek "Kode Pendaftaran SPMB Anda: {nomor}". Nomor menonjol, ringkasan, tautan halaman sukses bertoken, Cek Status, grup WA, instruksi berkas fisik. Queue, sekali kirim (`notifikasi_email_at`), template responsif sesuai desain.

---

## 16. Arahan Desain & Motion

### 16.1 Pembacaan brief

Situs penerimaan murid **SMK berbasis NU** untuk **siswa SMP/MTs dan orang tua di Banyumas** yang mayoritas memakai **HP Android dengan sinyal tidak selalu stabil**. Karakter visual: **hangat, terpercaya, modern, berani tapi tidak kekanak-kanakan**. Keterbacaan dan kejelasan mengalahkan efek.

### 16.2 Arah visual: "Editorial Hijau Pesantren Modern"

| Elemen | Ketentuan |
|---|---|
| Warna utama | Hijau NU `#057A3C` (primary), hijau tua `#03452A` (ink/heading di atas terang), hijau sangat tua `#0E1F17` (latar gelap) |
| Netral | Kertas hangat `#F6F3EC` (latar), `#E9E4D8` (garis/permukaan), teks `#16201A` |
| Aksen | Emas kunyit `#D9A21B`, **hanya** untuk satu elemen penting per layar (CTA utama atau sorotan) |
| Status | Hijau, biru, kuning, merah dengan kontras AA di atas latar kertas |
| Tipografi display | **Bricolage Grotesque** (karakter kuat, cocok untuk angka & kode jurusan besar) |
| Tipografi isi | **Plus Jakarta Sans** (dirancang desainer Indonesia, terbaca di layar kecil) |
| Angka | `font-variant-numeric: tabular-nums` di tabel, skor, statistik |
| Radius | Satu sistem: 6 px (input, badge), 14 px (kartu), penuh untuk pil |
| Ikon | Phosphor, bobot "regular" untuk UI, "duotone" hanya di ilustrasi section |
| Fotografi | Foto asli sekolah (`campus-front`, `gerbang-depan`, `kegiatan-siswa`, `lab-praktik`) dengan perlakuan duotone hijau-kertas yang konsisten. Tanpa foto stok |
| Tekstur | Ornamen geometris halus terinspirasi pola anyaman/mozaik, opasitas rendah, hanya di hero dan footer |
| Mode gelap | Token disiapkan untuk situs publik (latar `#0E1F17`). Wizard & admin terang dulu, gelap opsional. PDF & email selalu terang |

Font di-self-host (`next/font/local` atau `next/font/google` yang otomatis self-host) dengan `font-display: swap`.

### 16.3 Komposisi halaman

- **Hero**: grid asimetris. Kiri: judul besar dua baris ("Belajar terampil, tumbuh berakhlak." atau sejenis, final dari sekolah), subjudul, dua CTA, info gelombang aktif. Kanan: foto kampus duotone dalam bingkai tidak simetris, dengan stiker kecil "Akreditasi A" (hanya angka/fakta nyata). `min-h-[100dvh]` di mobile tanpa memotong CTA.
- **Program keahlian**: kode jurusan (AKL, MPLB, FKK, TKR) tampil sebagai tipografi raksasa yang jadi elemen visual utama; detail muncul saat hover/tap.
- **Alur daftar**: garis waktu horizontal di desktop, vertikal di mobile, digambar saat scroll.
- **Testimoni**: kutipan besar bergaya editorial, satu per satu, bukan grid kartu identik.
- Ritme section bervariasi (lebar penuh, dua kolom, offset) agar tidak terasa seperti template.

### 16.4 Anti AI slop: larangan wajib

- Gradien ungu/biru/pink, latar mesh blob, glassmorphism di mana-mana.
- Hero tengah dengan judul + dua tombol + mockup mengambang (pola template).
- Grid 3 kartu identik ikon-judul-teks untuk semua konten.
- Emoji sebagai ikon, ✨ atau 🚀 di teks.
- Font Inter/Roboto sebagai default tanpa alasan, campuran lebih dari 2 keluarga font.
- Label meta palsu ("SECTION 01", "/// FEATURES"), em-dash dekoratif, angka statistik palsu ("10.000+ siswa" tanpa data).
- Kalimat generik ("Wujudkan masa depan cemerlangmu bersama kami!"). Copy harus spesifik tentang sekolah ini.
- Tampilan default shadcn/ui tanpa kustomisasi token.
- Shadow berat bertumpuk, border radius campur aduk.
- Animasi yang memperlambat tugas (wizard, admin).

### 16.5 Pembagian peran Motion & GSAP

| Kebutuhan | Library | Contoh |
|---|---|---|
| Scroll storytelling landing | GSAP + ScrollTrigger | Garis alur daftar tergambar, parallax ringan foto hero, pin section program keahlian |
| Animasi teks judul | GSAP SplitText | Judul hero muncul per baris (sekali, ≤ 800 ms) |
| Transisi halaman & langkah wizard | Motion `AnimatePresence` | Geser + fade antar langkah |
| Layout animation | Motion `layout` | Kartu rekomendasi mengurut ulang, akordeon FAQ, tabel nilai menambah baris |
| Micro-interaction | Motion | Tombol tekan, lencana confidence muncul, toast |
| Bar skor & angka berjalan | Motion `animate` / `useSpring` | Bar kontribusi mapel, skor jurusan |

Aturan:

- GSAP hanya di route publik, dimuat dinamis (`next/dynamic` / `useGSAP` dalam client component). Jangan muat GSAP di wizard & admin.
- Semua animasi menghormati `prefers-reduced-motion` (Motion `useReducedMotion`, `gsap.matchMedia()`), runtuh ke statis.
- Durasi: micro 150-200 ms, transisi 250-350 ms, scroll reveal ≤ 800 ms. Hanya animasikan `transform` dan `opacity`.
- Dial intensitas: Landing 6/10, Detail & berita 4/10, Wizard 2/10, Admin 1/10.

### 16.6 Aturan UX wajib

- Mobile-first, diuji di 360, 768, 1024, 1440 px. Tanpa gulir horizontal.
- Target sentuh ≥ 44 px, fokus terlihat, kontras WCAG AA.
- Label di atas input, teks bantuan di bawah, galat dekat field (`aria-describedby`), ringkasan galat di atas form yang bisa diklik.
- Tombol utama penuh lebar di mobile. Keyboard numerik untuk NIK, NISN, HP, nilai (`inputMode="numeric"`).
- Status OCR berupa skeleton + teks, bukan spinner kosong.
- Empty state untuk semua daftar.
- Gambar WebP/AVIF via `next/image`, lazy-load, tanpa video hero.
- Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.

### 16.7 Pemakaian skill di Claude Code

| Tahap | Skill | Keluaran |
|---|---|---|
| M1 design system | `frontend-design` (plugin resmi Anthropic) sebagai skill utama. Bila terpasang, `ui-ux-pro-max` untuk menghasilkan `docs/design/DESIGN.md` | Token `@theme`, komponen `ui/*`, halaman katalog komponen `/admin/_katalog` (hanya local) |
| Landing, jurusan, berita | `frontend-design` + arahan 16.2-16.5. Skill taste komunitas (`design-taste-frontend`, `gpt-taste`) boleh dipakai bila terpasang, tetapi intensitas motion mengikuti dial 16.5 | |
| Wizard & admin | `frontend-design` dengan fokus kejelasan form dan kepadatan data | |
| Sebelum rilis | `design:accessibility-review`, `design:design-critique` | Laporan audit + perbaikan |

Bila arahan skill bertentangan dengan PRD, **PRD yang menang**.

---

## 17. Keamanan & Privasi

| Aspek | Ketentuan |
|---|---|
| Auth admin | Tabel `users`, bcrypt, Sanctum SPA, regenerate session, throttle login, Policy per peran |
| Siswa tanpa login | Draf: token acak 40 karakter di cookie httpOnly + Secure + SameSite=Lax, disimpan sebagai hash. Sukses/formulir: token acak (hash di DB). Cek status: nomor + tanggal lahir |
| Dokumen | Google Drive tanpa berbagi (scope `drive.file`), dilihat hanya lewat endpoint admin yang mencatat audit; disk lokal privat di luar `public/`; refresh token terenkripsi |
| Data sensitif | NIK, no KK, nomor HP dienkripsi (`encrypted` cast) **[KEPUTUSAN]**, data draf terenkripsi, masking di tabel admin |
| CSRF | Sanctum CSRF cookie untuk admin; endpoint draf memakai cookie SameSite + cek header `Origin` |
| XSS | React escaping default; HTML berita disanitasi di backend (HTMLPurifier) dan dirender hanya dari field tersanitasi |
| Upload | Validasi MIME asli + ekstensi + ukuran, nama diacak, tidak pernah dieksekusi. PDF diproses di ocr-service terisolasi |
| Rate limit | Lihat tabel 9.1 + login 5/mnt |
| OCR service | Jaringan internal saja, token internal, tanpa CORS publik |
| Header | HTTPS, HSTS, CSP (izinkan domain Supabase publik untuk gambar), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` (mencegah token di URL bocor lewat referer) |
| Supabase | RLS aktif tanpa policy anon, kunci rahasia hanya di backend |
| Audit | Login, verifikasi, edit, koreksi nilai, lihat dokumen, ekspor, ubah pengaturan/bobot |
| Retensi | `php artisan spmb:arsip {periode}` dan `spmb:hapus-draf` (draf kedaluwarsa + berkas temp > 24 jam) **[KEPUTUSAN: lama retensi]** |
| UU PDP | Teks persetujuan Langkah 1: tujuan, jenis data, lama penyimpanan, pihak pemroses (termasuk engine OCR cloud bila dipakai), kontak sekolah |

---

## 18. Bug v1 & Temuan Audit PRD v2

### 18.1 Bug v1 (dari PRD v2, tetap wajib diperbaiki)

| # | Temuan v1 | Perbaikan v3 |
|---|---|---|
| 1 | Rute admin tanpa middleware auth | Sanctum + Policy, test semua endpoint admin |
| 2 | Dokumen di disk publik | Google Drive privat + proxy admin, temp di disk privat |
| 3 | Sukses/PDF dibuka dengan nomor berurutan | Token acak (hash) |
| 4 | Kredensial admin di `pengaturans`, default `admin123` | Tabel `users`, seed dari env, wajib ganti |
| 5 | Nilai rapor Langkah 3 tidak tersimpan | Nilai rapor jadi inti rekomendasi, disimpan di draf & `pendaftar` |
| 6 | "Kriteria sekolah 10%" di FAQ tidak ada di kode | Rumus baru Bagian 12, FAQ diperbarui |
| 7 | Status `revisi` vs `revision` | PHP Enum `StatusVerifikasi` |
| 8 | Nomor pakai `date('Y')`, tanpa lock | Tahun ajaran + advisory lock |
| 9-10 | `SUBSTR`, `like` tidak cocok Postgres | `EXTRACT`, `ilike` |
| 11 | URL OCR hardcode, CORS `*` | Env + token + jaringan internal |
| 12 | Kontak chatbot hardcode | Pengaturan `kontak_panitia` |
| 13 | Data demo di produksi | Hanya `local` |
| 14 | Berkas kustom tertinggal di temp | Dipindah saat submit |
| 15 | Pengaturan query per panggilan | Cache |
| 16 | Gerbang `step6Post` salah | Gerbang di backend per langkah + test |
| 17 | `step3Lewati` via GET | Tidak ada lagi (rapor wajib) |
| 18 | Paket & berkas mati | Tidak dibawa ke v3 |
| 19-20 | Design system tidak sinkron, CSS 1.258 baris | Token Tailwind v4 + komponen React |
| 21 | Migrasi bertahap berantakan | Satu migrasi bersih per tabel |
| 22 | `file_exists(public_path())` | Cek path terisi / `Storage::exists` dengan cache |

### 18.2 Temuan audit PRD v2

| # | Temuan | Dampak | Perbaikan v3 |
|---|---|---|---|
| A1 | Kunci mapel `ipa_biologi/fisika/kimia`, `ips_ekonomi` tidak ada di rapor SMP/MTs Kurikulum Merdeka (IPA & IPS terpadu) | Rekomendasi tidak bisa dihitung dari rapor asli, OCR tidak bisa memetakan | Tabel `mata_pelajaran` + alias, bobot baru (12.3) |
| A2 | Blade + Alpine tidak mendukung Framer Motion dan tidak memisahkan frontend/backend | Tidak memenuhi arahan | Monorepo Laravel API + Next.js (6.1) |
| A3 | Session server + autosave `localStorage` berisi data pribadi | Data NIK/alamat tertinggal di HP bersama/warnet | Draf di server terenkripsi, `localStorage` tanpa PII |
| A4 | Rapor opsional & bisa dilewati, padahal jadi dasar rekomendasi | Rekomendasi kosong | Rapor wajib, input manual sebagai fallback |
| A5 | Tidak ada verifikasi nilai oleh panitia, siswa bisa menaikkan nilai | Rekomendasi & seleksi bisa dimanipulasi | `status_nilai`, penanda koreksi, layar verifikasi berdampingan (13.4) |
| A6 | Label skor absolut (≥60 Sangat Cocok) membuat siswa bernilai tinggi "Sangat Cocok" di semua jurusan | Rekomendasi tidak membedakan | Label relatif + rincian kontribusi (12.2) |
| A7 | Bobot hanya bisa diubah lewat seeder (v1) dan perubahan bobot tidak di-snapshot | Histori skor berubah diam-diam | Editor bobot + `rekomendasi_versi` |
| A8 | Engine OCR ditetapkan EasyOCR tanpa uji, padahal lemah untuk tabel rapor | Akurasi rapor rendah | Driver engine + spike benchmark (11.4) |
| A9 | PDF e-Rapor digital tetap di-OCR | Lambat & kurang akurat | Ekstraksi lapisan teks lebih dulu |
| A10 | Email wajib di Langkah 5 | Banyak siswa SMP belum punya email | Default opsional |
| A11 | Teks mentah OCR berpotensi disimpan/log | Kebocoran data pribadi | Tidak disimpan permanen, log tanpa PII |
| A12 | Chatbot disebut fitur cerdas padahal pencarian kata kunci | Ekspektasi salah | Diberi nama "Tanya Panitia", dinyatakan bukan AI |
| A13 | Campur istilah PPDB/SPMB | Tidak konsisten | SPMB di UI, format nomor jadi keputusan |
| A14 | Host pooler Supabase ditulis tetap (`aws-0-...`) | Bisa salah untuk proyek baru | Salin dari dashboard |
| A15 | Token di URL bisa bocor lewat header Referer | Akses data pendaftar | `Referrer-Policy` ketat, token di-hash di DB |
| A16 | Tidak ada kontrak API tertulis | Frontend & backend mudah tidak sinkron | `openapi.yaml` + tipe hasil generate |

---

## 19. Strategi Testing

**Backend (PHPUnit/Pest, Postgres lokal via Docker, bukan SQLite)**

- Port test v1: ekspor, kuota, input manual, konten CRUD + gambar, detail pendaftar, WA link, validasi Bagian A-D, email sekali kirim, Drive mati tetap jalan.
- Keamanan: loop semua route `admin/*` → 401 tanpa login; peran `konten` ditolak di endpoint pendaftar; dokumen privat tanpa URL publik; sukses/formulir dengan nomor → 404; cek status tanggal salah → pesan sama.
- Draf: tanpa cookie → 401/404; langkah melompat ditolak; draf kedaluwarsa ditolak; submit ganda dengan Idempotency-Key yang sama → satu baris.
- Nomor: submit paralel (dua proses) → nomor berbeda.
- Rekomendasi: kasus 12.4, bobot hilang dibagi ulang, snapshot versi.
- Form builder: field disembunyikan tidak wajib, field kustom wajib divalidasi, rapor tidak bisa dimatikan.
- Throttle semua endpoint publik sensitif.
- Google Drive: driver `lokal` di test; unit test `GoogleDriveDokumen` dengan klien Google di-mock; test job gagal → berkas lokal tidak terhapus & `berkas_sinkron = gagal`; token dicabut → antrean tertahan tanpa error ke siswa.
- Pakai `Storage::fake('supabase_public')`, `Storage::fake('dokumen_temp')`, `Mail::fake`, `Queue::fake`, `Http::fake` (OCR).

**OCR (pytest)**

- Parser akta/kk/rapor dengan fixture hasil engine (JSON kata + bbox), tidak bergantung engine.
- Pencocokan alias mapel, deteksi semester, pengabaian kolom predikat.
- `pdf_text` untuk PDF digital.
- Benchmark terpisah (`benchmark/`), tidak jalan di CI.

**Frontend (Vitest + Testing Library)**

- Komponen form: galat tampil, ringkasan galat, `aria-describedby`.
- Tabel nilai: rata-rata otomatis, penanda sel diubah.
- Reduced motion: animasi nonaktif.

**E2E (Playwright, viewport 360 & 1440)**

- Alur daftar lengkap dengan OCR di-mock → sukses → unduh PDF → cek status.
- Alur admin: login → verifikasi nilai → setujui → ekspor.
- Audit aksesibilitas otomatis (axe) di halaman utama.

---

## 20. Milestone

| # | Milestone | Isi | Selesai bila |
|---|---|---|---|
| M0 | Fondasi monorepo | Struktur folder 6.4, Laravel API, Next.js, ocr-service kosong, Docker Compose dev, Supabase (DB, bucket publik, RLS), OAuth Google Drive + driver `PenyimpananDokumen`, CI (lint + test ketiga proyek), `CLAUDE.md` | Migrasi ke Supabase sukses, unggah-lihat-hapus file uji di Google Drive berhasil, CI hijau |
| M1 | Design system | Token `@theme`, font, komponen `ui/*`, wrapper motion, layout publik/wizard/admin, katalog komponen | Katalog tampil benar di 360 & 1440 px, lolos axe |
| M2 | Data, auth, API dasar | Semua migrasi, seeder (jurusan, mapel, bobot, FAQ, form field, superadmin), Sanctum + peran + audit, `openapi.yaml` awal | Test akses admin hijau |
| M3 | Konten & landing | CRUD konten & jurusan, pengaturan, landing + GSAP, detail jurusan, berita, revalidasi | Test aktif/nonaktif & empty state, Lighthouse ≥ target |
| M4 | Wizard tanpa OCR | Draf, langkah 1-8 dengan isian manual, form schema dinamis, tabel nilai manual, rekomendasi, submit, nomor, sukses, cek status | E2E alur manual hijau |
| M5a | Spike engine OCR | Benchmark 11.4, ADR keputusan engine | ADR disetujui |
| M5b | OCR terintegrasi | Driver engine terpilih, parser akta/kk/rapor, `pdf_text`, endpoint backend, UI Langkah 2-3, fallback | Akurasi memenuhi KPI 2-3, fallback saat service mati |
| M6 | Admin operasional | Dashboard, data peserta, verifikasi berdampingan + koreksi nilai, detail, edit, kuota, input manual, editor bobot + pratinjau, statistik OCR | Test verifikasi & koreksi tercatat audit |
| M7 | Keluaran | PDF F4 + barcode, rekap PDF, XLSX lengkap, email queue | PDF dibandingkan visual dengan formulir kertas |
| M8 | Tanya Panitia | Widget FAQ + saran | Test pencarian & throttle |
| M9 | Hardening & rilis | Checklist 16.6 & 17, audit a11y & desain, backup, jadwal pembersihan, dokumentasi operator, UAT panitia | Semua checklist lolos |

---

## 21. Deployment & Operasional

### 21.1 Hosting

- **VPS** (min. 2 vCPU, 4 GB RAM; 4 vCPU / 8 GB bila engine OCR self-hosted berat seperti PaddleOCR) di Jakarta/Singapura.
- `docker compose` service: `nginx`, `backend` (PHP-FPM), `frontend` (Next.js standalone), `ocr`, `queue` (`php artisan queue:work`), `scheduler` (`php artisan schedule:work`).
- Hanya `nginx` yang membuka port 80/443. HTTPS Let's Encrypt.
- Frontend memanggil backend dari server component lewat URL internal (`BACKEND_INTERNAL_URL=http://backend`), dari browser lewat `/api` (domain sama).

### 21.2 Jadwal

| Jadwal | Tugas |
|---|---|
| Tiap jam | Hapus draf kedaluwarsa + berkas temp-nya |
| Tiap 15 menit | Ulang unggah berkas `berkas_sinkron = menunggu/gagal` yang sudah lewat backoff |
| Harian 02:00 | Hapus berkas di disk lokal `draf/` > 24 jam tanpa draf aktif (berkas pendaftar yang belum tersinkron tidak dihapus) |
| Harian 06:00 | Cek kuota & status token Google Drive, kirim email peringatan ke superadmin bila ≥ 80% atau terputus |
| Harian 03:00 | Backup `pg_dump` (bila tidak pakai backup Pro) |
| Mingguan | Ringkasan pendaftar ke email panitia (opsional) |

### 21.3 Perintah setup awal

```bash
mkdir spmb-v3 && cd spmb-v3 && git init
# backend
composer create-project laravel/laravel backend
cd backend && php artisan install:api
composer require barryvdh/laravel-dompdf maatwebsite/excel league/flysystem-aws-s3-v3 google/apiclient mews/purifier
composer require --dev laravel/pint larastan/larastan
cd ..
# frontend
npx create-next-app@latest frontend --ts --tailwind --app --src-dir --eslint
cd frontend
npm install motion gsap @gsap/react @radix-ui/react-dialog @radix-ui/react-select \
  react-hook-form zod @hookform/resolvers @tanstack/react-query @phosphor-icons/react
npm install -D openapi-typescript vitest @testing-library/react @playwright/test
cd ..
# ocr-service
mkdir -p ocr-service/app/{engines,parsers} ocr-service/{benchmark,tests}
```

### 21.4 Variabel lingkungan

Lampiran 23.7.

---

## 22. Keputusan & Pertanyaan Terbuka

**Untuk tim pengembang**

| # | Keputusan | Default sementara |
|---|---|---|
| D1 | Engine OCR | Ditentukan spike M5a (11.4) |
| D2 | Enkripsi NIK/HP vs kemudahan pencarian | Enkripsi + hash pencarian |
| D3 | Library grafik admin (Recharts / Chart.js) | Recharts |
| D4 | Akun Google Drive: pribadi sekarang, pindah ke akun khusus SPMB / akun sekolah kapan? | Akun pribadi untuk pengembangan & periode pertama |

**Untuk pihak sekolah**

| # | Pertanyaan | Dampak |
|---|---|---|
| S1 | Nama resmi FKK | Label, PDF |
| S2 | Format nomor `SPMB-` atau `PPDB-` | Generator nomor |
| S3 | Semester rapor yang dipakai (1-5? 1-6?) dan kolom nilai yang dipakai untuk rapor K13 | OCR & rekomendasi |
| S4 | Persetujuan guru BK atas bobot mapel per jurusan | Bagian 12.3 |
| S5 | Akta & KK wajib atau opsional saat daftar daring | Form builder |
| S6 | Email siswa wajib atau opsional | Langkah 5 |
| S7 | Boleh memakai OCR cloud (data dikirim ke pihak ketiga) atau harus self-hosted | Pilihan engine |
| S8 | Jadwal gelombang & tanggal verifikasi berkas fisik | Pengaturan, tanda terima |
| S9 | Lama retensi data setelah periode selesai | Perintah arsip |
| S10 | Daftar akun admin dan perannya | Seeder |
| S11 | Kontak panitia resmi | Footer, Tanya Panitia |
| S12 | Notifikasi email saat status berubah | Fitur 13.4 |
| S13 | Paket Supabase Free atau Pro, anggaran VPS | Operasional |
| S15 | Siapa yang memegang akun Google Drive penyimpanan dokumen setelah proyek diserahkan | Kelanjutan akses data |
| S14 | Copy hero & sambutan kepala sekolah | Landing |

---

## 23. Lampiran

### 23.1 Seed jurusan

| Kode | Deskripsi | Prospek karier | Keunggulan |
|---|---|---|---|
| AKL | Akuntansi, pembukuan, perpajakan, perbankan, dan pengelolaan keuangan lembaga | Staf Akuntansi, Kasir Bank, Staf Pajak, Wirausaha | Praktik aplikasi akuntansi, kunjungan industri perbankan |
| MPLB | Manajemen perkantoran modern, layanan bisnis, komunikasi profesional, administrasi | Sekretaris, Admin Perkantoran, Customer Service, Resepsionis | Praktik kantor, kearsipan digital |
| FKK | Ilmu farmasi, pengelolaan obat, pelayanan kesehatan di apotek, klinik, rumah sakit | Asisten Tenaga Kefarmasian, Staf Apotek/Klinik, Wirausaha Apotek | Laboratorium farmasi |
| TKR | Perawatan & perbaikan kendaraan ringan, sistem mesin, kelistrikan | Mekanik, Teknisi, Staf Bengkel Resmi, Wirausaha Bengkel | Bengkel praktik |

(Teks keunggulan adalah contoh, final dari sekolah.)

### 23.2 Seed mata pelajaran (SMP/MTs Kurikulum Merdeka + K13)

| Kode | Nama | Alias (contoh) | Kelompok |
|---|---|---|---|
| pai | Pendidikan Agama Islam dan Budi Pekerti | pendidikan agama islam, pai, pendidikan agama, agama | umum |
| ppkn | Pendidikan Pancasila | pendidikan pancasila, pendidikan pancasila dan kewarganegaraan, ppkn, pkn | umum |
| b_indonesia | Bahasa Indonesia | bahasa indonesia, b. indonesia, b indonesia | umum |
| matematika | Matematika | matematika, mtk | umum |
| ipa | Ilmu Pengetahuan Alam | ilmu pengetahuan alam, ipa | umum |
| ips | Ilmu Pengetahuan Sosial | ilmu pengetahuan sosial, ips | umum |
| b_inggris | Bahasa Inggris | bahasa inggris, b. inggris | umum |
| pjok | PJOK | pendidikan jasmani olahraga dan kesehatan, pjok, penjasorkes | umum |
| informatika | Informatika | informatika, tik | umum |
| seni | Seni Budaya | seni budaya, seni musik, seni rupa, seni tari, seni teater | umum |
| prakarya | Prakarya | prakarya, seni dan prakarya, prakarya dan kewirausahaan | umum |
| b_jawa | Bahasa Jawa | bahasa jawa, basa jawa, b. jawa | mulok |
| quran_hadis | Al-Qur'an Hadis | al-qur'an hadis, quran hadits | madrasah |
| akidah_akhlak | Akidah Akhlak | akidah akhlak, aqidah akhlak | madrasah |
| fikih | Fikih | fikih, fiqih, fiqh | madrasah |
| ski | Sejarah Kebudayaan Islam | sejarah kebudayaan islam, ski | madrasah |
| b_arab | Bahasa Arab | bahasa arab | madrasah |

Catatan: rapor MTs memecah PAI menjadi mapel madrasah. Bila `pai` tidak ditemukan tetapi mapel madrasah ada, `pai` = rata-rata mapel madrasah (aturan di `RekomendasiService`).

### 23.3 Seed field formulir bawaan

| Langkah | Kunci (urutan, catatan) |
|---|---|
| step1 | nama_lengkap 10, nisn 20, tanggal_lahir 25, setuju 30 (checkbox, wajib) |
| step2 | akta 10 (file), kk 20 (file) |
| step3 | rapor 10 (file, wajib, terkunci), nilai_rapor 20 (tabel, wajib, terkunci) |
| step4 | jurusan_1 10 (wajib), jurusan_2 20 (opsional) |
| step5 | tempat_lahir 20, jenis_kelamin 50, nik 40, no_kk 41, agama 60, anak_ke 70, jumlah_saudara 71, asal_sekolah 90, tamat_tahun 100, no_ijazah 101 (opsional), no_hp 110, no_wa 111 (opsional), email 120 (opsional), rt 130, rw 131, desa 132, kecamatan 133, kabupaten 134, propinsi 135, penghasilan 140 (radio), referensi_pendaftar 150 (opsional) |
| step6 | nama_ayah 10, ayah_ttl 11, ayah_pendidikan 12, pekerjaan_ayah 13, nama_ibu 20, ibu_ttl 21, ibu_pendidikan 22, pekerjaan_ibu 23, no_hp_ortu 30, ortu_rt 31, ortu_rw 32, ortu_desa 33, ortu_kecamatan 34, ortu_kabupaten 35, ortu_propinsi 36 |
| step7 | smp_kecamatan 1, smp_kabupaten 2, smp_propinsi 3, ijazah_nomor_tahun 4 (opsional), lama_belajar 5, nilai_ujian 6, golongan_darah 10, tinggi_badan 11, berat_badan 12, penyakit_pernah_diderita 13 (opsional), hobi_* 14-18 (opsional), ukuran_seragam 20 |
| step8 | konfirmasi_final 10 (checkbox, wajib) |

### 23.4 Berkas fisik (tanda terima)

1. Akta asli / Ijazah SD/MI (1)
2. Fotokopi Akta Kelahiran (1)
3. Fotokopi Kartu Keluarga (1)
4. Fotokopi KIP/KIS/PKH (1)
5. Fotokopi KTP orang tua (2)
6. Pas foto 3×4 (2)
7. Surat Keterangan Lulus (1)
8. Fotokopi Ijazah SMP/MTs (1)
9. **Baru v3**: Fotokopi rapor semester yang diunggah (1 set), untuk verifikasi nilai

### 23.5 Opsi dropdown & stopword

| Field | Opsi |
|---|---|
| jenis_kelamin | L: Laki-laki, P: Perempuan |
| agama | Islam, Kristen, Katolik, Hindu, Buddha, Konghucu |
| penghasilan | 01: < Rp 500.000 · 02: Rp 500.000-999.999 · 03: Rp 1.000.000-1.999.999 · 04: Rp 2.000.000-4.999.999 · 05: ≥ Rp 5.000.000 |
| pendidikan ortu | SD, SMP, SMA/SMK, Diploma, Sarjana, Pascasarjana |
| pekerjaan_ayah | Petani, Buruh, Wiraswasta, PNS, TNI/Polri, Guru, Karyawan Swasta, Lainnya |
| pekerjaan_ibu | Ibu Rumah Tangga, Petani, Buruh, Wiraswasta, PNS, Guru, Karyawan Swasta, Lainnya |
| golongan_darah | A, B, AB, O, Tidak Tahu |
| ukuran_seragam | M, L, XL, XXL, XXXL, Jumbo |
| nilai ujian (Bagian B) | b_indonesia, b_inggris, matematika, ipa |
| status_verifikasi | pending, approved, revision, rejected |
| status_nilai | belum_dicek, sesuai, dikoreksi |
| sumber | daring, luring |

Stopword FAQ: apa, bagaimana, cara, di, ke, dari, yang, untuk, dengan, dan, atau, ini, itu, saya, ada, bisa, apakah, berapa, kapan, dimana.

### 23.6 Kolom Bagian A-D tabel `pendaftar`

- **A**: nama_lengkap, tempat_lahir, tanggal_lahir, nisn, nik (+ nik_hash), no_kk, jenis_kelamin, agama, anak_ke, jumlah_saudara, asal_sekolah, tamat_tahun, no_ijazah, no_hp, no_wa, email, alamat, rt, rw, desa, kecamatan, kabupaten, propinsi, nama_ayah, ayah_ttl, ayah_pendidikan, pekerjaan_ayah, nama_ibu, ibu_ttl, ibu_pendidikan, pekerjaan_ibu, alamat_ortu, ortu_rt, ortu_rw, ortu_desa, ortu_kecamatan, ortu_kabupaten, ortu_propinsi, no_hp_ortu, penghasilan, referensi_pendaftar
- **B**: smp_kecamatan, smp_kabupaten, smp_propinsi, ijazah_nomor_tahun, lama_belajar, nilai_ujian (jsonb)
- **C**: golongan_darah, tinggi_badan, berat_badan, penyakit_pernah_diderita
- **D**: hobi_olahraga, hobi_kesenian, hobi_organisasi, hobi_prestasi, hobi_lain, ukuran_seragam

Aturan validasi tiap field sama dengan PRD v2 Bagian 9.4 Langkah 5-7, kecuali `email` (opsional) dan NISN/nama/tanggal lahir yang dikunci dari Langkah 1.

### 23.7 Template `.env`

**backend/.env**

```env
APP_NAME="SPMB SMK Ma'arif NU 1 Wangon"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://spmb.smkmanu1wangon.sch.id
FRONTEND_URL=https://spmb.smkmanu1wangon.sch.id
APP_LOCALE=id
APP_TIMEZONE=Asia/Jakarta

DB_CONNECTION=pgsql
DB_HOST=
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.<PROJECT_REF>
DB_PASSWORD=
DB_SSLMODE=require

SESSION_DRIVER=database
SESSION_DOMAIN=spmb.smkmanu1wangon.sch.id
SESSION_SECURE_COOKIE=true
SANCTUM_STATEFUL_DOMAINS=spmb.smkmanu1wangon.sch.id
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local

# Konten publik (Supabase Storage)
SUPABASE_S3_ENDPOINT=https://<PROJECT_REF>.supabase.co/storage/v1/s3
SUPABASE_S3_REGION=ap-southeast-1
SUPABASE_S3_KEY=
SUPABASE_S3_SECRET=
SUPABASE_BUCKET_PUBLIC=konten-publik
SUPABASE_PUBLIC_URL=https://<PROJECT_REF>.supabase.co/storage/v1/object/public/konten-publik

# Dokumen pendaftar (Google Drive, OAuth)
DOKUMEN_DRIVER=google_drive          # google_drive | lokal
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REDIRECT_URI=https://spmb.smkmanu1wangon.sch.id/api/v1/admin/google-drive/callback
GOOGLE_DRIVE_ROOT_FOLDER_NAME=SPMB
# Refresh token TIDAK ditaruh di .env: disimpan terenkripsi di tabel pengaturans setelah tombol Hubungkan

MAIL_MAILER=smtp
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS="spmb@smkmanu1wangon.sch.id"
MAIL_FROM_NAME="${APP_NAME}"

OCR_SERVICE_URL=http://ocr:8001
OCR_SERVICE_TOKEN=
OCR_TIMEOUT=90

DRAFT_TTL_DAYS=7
FRONTEND_REVALIDATE_URL=http://frontend:3000/api/revalidate
FRONTEND_REVALIDATE_SECRET=

ADMIN_SEED_USERNAME=superadmin
ADMIN_SEED_PASSWORD=

WA_GROUP_URL=
```

**frontend/.env**

```env
NEXT_PUBLIC_SITE_URL=https://spmb.smkmanu1wangon.sch.id
NEXT_PUBLIC_API_BASE=/api/v1
BACKEND_INTERNAL_URL=http://backend
REVALIDATE_SECRET=
NEXT_PUBLIC_SUPABASE_PUBLIC_URL=https://<PROJECT_REF>.supabase.co/storage/v1/object/public/konten-publik
```

**ocr-service/.env**

```env
OCR_SERVICE_TOKEN=
OCR_ENGINE=paddleocr        # kandidat: paddleocr | easyocr | tesseract | google_vision | azure_di | vision_llm
OCR_ENGINE_RAPOR=
OCR_LANGS=id,en
OCR_MAX_PAGES=10
# Kunci engine cloud (hanya bila dipilih)
GOOGLE_APPLICATION_CREDENTIALS=
AZURE_DI_ENDPOINT=
AZURE_DI_KEY=
```

### 23.8 Aset v1 yang dibawa

| Berkas v1 | Tujuan di v3 |
|---|---|
| `paddle_ocr_server.py` | `ocr-service/app/parsers/akta.py`, `kk.py` (parser dipisah dari engine), engine EasyOCR jadi `engines/easyocr.py` |
| `public/js/ocr-engine.js` | `frontend/src/features/ocr/` (`nameSimilarity`, `preprocessImage`, logika isi otomatis) dalam TypeScript |
| `app/Support/FormFieldConfig.php` | `backend/app/Services/FormSchema/` + endpoint form schema |
| `app/Support/PenyimpananDokumen.php` | `backend/app/Services/Penyimpanan/` menjadi interface + driver Google Drive & lokal |
| `app/Support/Code39Barcode.php` | `backend/app/Services/Pdf/` |
| `app/Support/GoogleDrive.php` | Dasar `GoogleDriveDokumen` (wajib, diubah dari service account ke OAuth) |
| `app/Exports/ParticipantsExport.php` | Diperluas |
| `resources/views/ppdb/formulir-pdf.blade.php` | `backend/resources/views/pdf/formulir.blade.php` |
| `database/seeders/*` | Diperbarui (mapel, bobot baru) |
| `tests/Feature/*` | Diport ke API |
| `public/images/*` | `frontend/public/images/` (dikonversi WebP/AVIF) |
| Formulir kertas `.docx/.md` | `docs/referensi/` |
