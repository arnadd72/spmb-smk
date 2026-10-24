# PRD: Portal SPMB SMK Ma'arif NU 1 Wangon v4

| | |
|---|---|
| **Dokumen** | Product Requirements Document v4.0 |
| **Menggantikan** | PRD v3.1 (10 Oktober 2026) |
| **Perubahan utama** | Arsitektur dipindah total dari Laravel ke **Next.js full-stack** agar hosting, database, storage, dan OCR bisa hampir sepenuhnya gratis. PDF formulir wajib sama persis dengan template resmi. Urutan kerja dibalik: fitur & tampilan selesai dulu, baru penyiapan layanan produksi |
| **Dasar** | PRD v3.1, arahan pemilik proyek 11 Oktober 2026, status progres proyek saat ini (Bagian 1.2) |
| **Bahasa antarmuka** | Bahasa Indonesia |
| **Status** | Acuan proyek aktif. Keputusan terbuka ditandai **[KEPUTUSAN]**. Bagian yang terkunci menunggu berkas dari Anda ditandai **[BLOKIR]** |

> **Cara pakai (untuk Claude Code / agen AI apa pun)**
> 1. File ini adalah `docs/PRD.md` — sumber kebenaran tunggal. Baca seluruhnya sebelum menyentuh kode, termasuk kalau Anda agen baru yang belum pernah melihat proyek ini.
> 2. Bagian 24 berisi instruksi transisi khusus karena proyek ini baru dipindah dari arsitektur Laravel. Baca itu LEBIH DULU bila ada kode lama di repo.
> 3. Ikuti roadmap dua fase di Bagian 20. Fase A (fitur & tampilan) dikerjakan dulu, dengan database dan storage LOKAL. Fase B (produksi) baru setelah tim pemilik proyek menyetujui tampilan dan fitur.
> 4. Bagian 15.1 (PDF formulir) sudah selesai; template ada di `docs/template-formulir.docx`. Jangan menebak desain di luar template.
> 5. Jangan menambah fitur, library, atau mengubah arsitektur di luar PRD ini tanpa bertanya. Kalau ada keputusan baru, PRD diperbarui dulu baru kode menyusul.

---

## Daftar Isi

1. Ringkasan Perubahan & Status Proyek
2. Ringkasan Produk
3. Tujuan & KPI
4. Ruang Lingkup
5. Aktor & Hak Akses
6. Arsitektur, Tech Stack & Struktur Folder
7. Database, Storage & Layanan Eksternal
8. Skema Database (Prisma)
9. Kontrak API (Route Handlers)
10. Fitur Publik & Wizard Pendaftaran
11. OCR: PaddleOCR di browser pendaftar
12. Rekomendasi Jurusan dari Nilai Rapor
13. Panel Admin
14. Form Builder Dinamis
15. Dokumen Keluaran (PDF, XLSX, Email)
16. Arahan Desain & Motion
17. Keamanan & Privasi
18. Bug v1 & Temuan Audit
19. Strategi Testing
20. Roadmap Dua Fase
21. Deployment (Vercel)
22. Keputusan & Pertanyaan Terbuka
23. Lampiran
24. Instruksi Transisi untuk Claude Code

---

## 1. Ringkasan Perubahan & Status Proyek

### 1.1 Apa yang berubah dari v3.1

| # | Area | v3.1 | v4 | Alasan |
|---|---|---|---|---|
| 1 | Backend | Laravel 13 (API terpisah) | **Dihapus.** Logic backend pindah ke Next.js Route Handlers | Laravel butuh server nyala 24 jam → tidak bisa hosting gratis |
| 2 | Hosting | VPS + Docker Compose | **Vercel** (push ke git, otomatis deploy) | Gratis (Hobby), tanpa VPS, tanpa Docker di produksi |
| 3 | Struktur folder | `backend/` dan `frontend/` terpisah penuh (dua aplikasi) | **Satu aplikasi Next.js**, dipisah secara logis: `src/app/` (tampilan + route API), `src/server/` (semua logic backend: db, service, validasi) | Konsekuensi dari satu-aplikasi; lihat 6.1 untuk detail trade-off |
| 4 | Database | Supabase (dipakai sejak awal lewat Laravel) | Supabase tetap dipakai, tapi **baru disambungkan di Fase B**. Selama Fase A pakai Postgres lokal (Docker, sudah ada) | Prioritas baru: fitur jalan dulu secara lokal |
| 5 | ORM | Eloquent (Laravel) | **Prisma** | Standar Next.js + Postgres, tipe TypeScript otomatis |
| 6 | OCR | Driver dipilih lewat spike benchmark (PaddleOCR/EasyOCR/dll, self-hosted) | **PaddleOCR PP-OCRv6 tiny di browser pendaftar** (ONNX + WebAssembly, Web Worker), tanpa server dan tanpa Google Vision (butir 39) | Tanpa server Python, tanpa kuota dan biaya, foto dokumen tidak dikirim ke pihak ketiga. Gagal atau kurang jelas = isi manual |
| 7 | Storage dokumen | Google Drive (OAuth) | **Tetap Google Drive**, klien Node (`googleapis`) menggantikan klien PHP | Sudah diputuskan di v3.1, tetap dipakai |
| 8 | Storage sementara wizard | Disk lokal privat VPS | **Bucket privat Supabase Storage** (`draf-temp`) | Di serverless, disk tidak persisten antar request. Lihat 7.4 |
| 9 | Email | SMTP + queue Laravel | **Resend** (API) | Gratis 3.000 email/bulan, tanpa server SMTP sendiri |
| 10 | Tugas terjadwal | `php artisan schedule:work` tiap jam | **Vercel Cron**, maksimal 1x/hari di paket gratis | Konsekuensi Vercel Hobby; jadwal disesuaikan (20.3) |
| 11 | PDF formulir | Dibuat meniru formulir kertas (DomPDF) | **Wajib sama persis (100%)** dengan `docs/template-formulir.*` yang akan diberikan pemilik proyek, dibuat dengan menimpa teks di atas PDF template yang terkunci | Permintaan baru pemilik proyek |
| 12 | Urutan pengerjaan | Fondasi infra dulu (M0), fitur belakangan | **Dibalik.** Semua tampilan & fitur selesai dulu (lokal), baru pasang Supabase/Drive/Vercel produksi | Supaya tim bisa melihat dan mencoba sebelum infra produksi disiapkan |
| 13 | Validasi | Dua tempat: FormRequest Laravel + Zod frontend | **Satu skema Zod**, dipakai bareng di client dan server | Konsekuensi baik dari satu aplikasi: tidak ada duplikasi aturan validasi |

### 1.2 Status proyek saat ini (dicatat 11 Oktober 2026)

Sebelum revisi ini, pengerjaan M0 (fondasi Laravel) sudah ~80% dan M1 (design system Next.js) **sudah selesai**:

**Yang sudah ada dan statusnya di v4:**

| Pekerjaan lama | Status di v4 |
|---|---|
| Struktur monorepo `backend/`+`frontend/`, 4 `CLAUDE.md` | Dirombak. Struktur baru di Bagian 6.4 |
| Laravel 13 + migrasi RLS + `PenyimpananDokumen` (driver lokal & Google Drive) + OAuth + tabel `pengaturans` + command `spmb:drive-*` + endpoint health | **Diarsipkan**, tidak dipakai lagi. Konsepnya (abstraksi storage, alur OAuth) dipakai ulang sebagai acuan desain saat menulis versi TypeScript-nya |
| `ocr-service/` FastAPI kosong | **Diarsipkan**, tidak dipakai lagi (OCR pindah ke browser pendaftar, Bagian 11) |
| Docker Compose dev & prod + Nginx | **Diarsipkan** untuk referensi lokal (dev Postgres-nya masih dipakai, lihat 7.1), konfigurasi prod/Nginx tidak relevan lagi karena hosting pindah ke Vercel |
| CI GitHub Actions (3 proyek) | Ditulis ulang untuk satu proyek Next.js |
| **Next.js 16: token desain, font, komponen `ui/*`, wrapper motion, layout tiga area, katalog `/admin/_katalog`** | **Dipakai penuh, tidak diulang.** Ini kerja frontend murni, tidak bergantung Laravel. Pindahkan ke struktur folder baru (Bagian 6.4), sisanya tetap |
| Dokumentasi di `docs/design/` (tangkapan layar 360 & 1440 px, hasil axe) | Tetap dipakai sebagai acuan |

**Kesimpulan:** kerja M1 (design system) nyaris 100% bisa dipakai lagi. Kerja M0 (backend Laravel) jadi referensi konsep saja, kodenya ditulis ulang di TypeScript. Tidak ada yang hilang sia-sia — keputusan arsitektur dari M0 (storage abstraction, alur OAuth Drive) tetap dipakai, hanya bahasanya yang beda.

Instruksi lengkap transisi ada di **Bagian 24**.

### 1.3 Status pengerjaan dan keputusan implementasi (diperbarui tiap milestone)

Bagian ini adalah catatan hidup untuk agen yang melanjutkan. Perbarui di commit yang sama dengan pekerjaannya.

| Milestone | Status | Catatan |
|---|---|---|
| Transisi 24.1 (arsip Laravel, pindah ke root) | Selesai 11 Okt 2026 | Commit `2bed102`, `8f039de`. PRD v3.1 disimpan di `docs/arsip/PRD-v3.1.md` karena PRD ini merujuknya |
| A0 Fondasi v4 | Selesai kecuali uji Drive nyata | Login admin, Prisma 7 + Postgres lokal, sesi JWT, kripto, driver Drive/Supabase-temp, rute OAuth Drive, CI. **Uji unggah-lihat-hapus ke Google Drive sungguhan menunggu kredensial OAuth** (lihat 24.2). Kodenya sudah diuji dengan mock |
| A1 Design system | Selesai (M1 lama) | Dipindah tanpa perubahan isi |
| A2 Data & auth | Selesai | Semua model Prisma (Bagian 8), seed (4 jurusan, 17 mapel, 19 bobot, 65 field formulir, 6 FAQ), matriks peran (`src/server/auth/peran.ts`), `GET /admin/jurusan` dan `/admin/mapel`, `docs/api/openapi.yaml` + tipe terbangkit `src/types/api.d.ts`. Test otomatis memindai SEMUA rute admin dan memastikan 401 tanpa sesi |
| A3 Konten & landing | Selesai (11 Okt 2026) | Landing, `/jurusan`, `/jurusan/[kode]`, `/berita`, `/berita/[slug]`, CRUD admin semua konten, pengaturan; landing kini memuat berita, agenda, galeri, dan testimoni dari DB (bagian kosong disembunyikan, galeri admin ≥ 3 foto menggantikan foto bawaan), unggah gambar dari admin, endpoint JSON publik. Uji unggah ke Supabase nyata menunggu kredensial (Fase B) |
| A4 Wizard tanpa OCR | Selesai | Draf bertoken, 8 langkah isian manual dari form builder, tabel nilai rapor manual, rekomendasi bobot, submit + nomor, halaman sukses, cek status. Berkas unggahan memakai driver disk lokal (butir 24). E2E hijau |
| 15.1 PDF formulir | Selesai | Template Word diekspor ke PDF dasar, isian ditimpa `pdf-lib` di koordinat terpetakan. Detail di 15.1 dan butir 28 |
| A6 Panel admin | Selesai (11 Okt 2026) | Semua menu PRD 13 kecuali Ekspor XLSX (A7): dashboard, data peserta, detail dan ubah, verifikasi, kuota, input manual, kelola berkas, konten, jurusan dan bobot, mata pelajaran, isian formulir, pengaturan, statistik OCR, akun admin, audit log. 218 test unit dan 76 e2e hijau |
| A7 Dokumen keluaran | Selesai kecuali peringatan kuota dan ringkasan mingguan | Ekspor XLSX, rekap PDF, email Resend kode pendaftaran, cron harian (butir 35) |
| A8 Tanya Sunan | Selesai | Chatbot aturan + FAQ + cadangan Gemini (butir 36); panggilan Gemini nyata menunggu API key |
| A5 OCR di browser | Selesai (13 Okt 2026) | PaddleOCR PP-OCRv6 tiny di Web Worker, deskew, parser akta/KK/rapor, kartu hasil dan tabel nilai yang bisa diedit, prapengisian langkah 5 dan 6, fallback isi manual, statistik di `OcrHasil` (butir 39 dan Bagian 11). **Akurasi pada foto dokumen asli belum teruji luas** (lihat 11.6) |

Keputusan implementasi yang menyimpang dari teks lama atau melengkapinya:

- **Slideshow hero beranda (21 Okt 2026):** hero berganti foto otomatis tiap 5 detik dengan **bergeser dari kanan ke kiri** (22 Okt 2026, permintaan sekolah; sebelumnya memudar), berputar tanpa memutar balik: foto berikutnya diletakkan di kanan tanpa transisi lalu digeser masuk, foto lama keluar ke kiri. Tanpa transisi di mode kurangi gerak, berhenti saat hero di luar layar atau tab tersembunyi. Arah geser diuji e2e (`hero-slideshow.spec.ts`). Foto pertama tetap aset "Foto utama beranda"; foto lainnya dari tabel baru `FotoHero` (judul sebagai teks alternatif, gambar, urutan, aktif; maksimal 6) yang dikelola admin di halaman Foto Beranda, di dalam kartu "Foto utama beranda" (butir 64), lewat CRUD konten entitas `hero` (`/api/v1/admin/hero`). Tanpa foto tambahan, hero tampil satu foto dan tidak berganti. Migrasi `20261021120000_foto_hero`.
- **Unggah berkas (21 Okt 2026):** tiap slot berkas punya dua tombol, "Ambil dari kamera" (input `capture`; kamera depan untuk pas foto, belakang untuk akta dan KK) dan "Pilih dari galeri atau berkas". Memilih kamera untuk pas foto menampilkan peringatan wajib berseragam OSIS SMP. Tahun tamat (`tamat_tahun`) menjadi dropdown 2025 sampai 2030. Isian bertipe `number` hanya menerima angka. Chatbot "Tanya Panitia" berganti nama menjadi "Tanya Sunan".

1. **Postgres lokal tanpa Docker.** Mesin pengembang tidak punya Docker. `npm run db:start` (`scripts/db-lokal.mjs`) membuat cluster Postgres terpisah di `.local/pgdata` (port 5433, user `spmb`, password dev `spmb_dev`, database `spmb` dan `spmb_test`) memakai binary Postgres milik Laragon (`PG_BIN` bisa diubah). Docker tetap opsional: konfigurasi lama ada di `_archive/infra-docker/`. `.env.example` memakai port 5433 (bukan 5432 seperti contoh 23.7).
2. **Prisma 7.10.0 (stabil)**, bukan tag `latest` npm (saat ini RC 8.x). Di Prisma 7 URL koneksi ada di `prisma.config.ts`, klien dibangkitkan ke `src/generated/prisma` (tidak di-commit, dibuat oleh `postinstall`), dan klien memakai adapter `@prisma/adapter-pg`.
3. **`proxy.ts`, bukan `middleware.ts`.** Next.js 16 mengganti namanya. `src/proxy.ts` hanya pengecekan awal (ada cookie atau tidak). Keabsahan token dan peran diperiksa di layout panel dan di setiap route handler lewat `wajibSesiAdmin()`.
4. **`cacheComponents` dan `partialPrefetching` dimatikan** di `next.config.ts`. Keduanya mewajibkan `<Suspense>` untuk semua akses data dinamis, tidak cocok dengan halaman admin dan wizard. `output: "standalone"` dihapus karena Vercel yang membangun.
5. **`kripto.ts` di `src/server/services/kripto.ts`** (satu file untuk NIK, hash pencarian, token, dan refresh token Drive). Bagian 7.3 menyebut `penyimpanan/kripto.ts`; yang berlaku adalah lokasi di Bagian 8.
6. **Sisi klien boleh mengimpor modul validasi murni** (`src/server/validasi`, `src/server/types`) lewat `schema-client.ts` per fitur, sesuai 6.4. Impor lain dari `src/server` dilarang.
7. **Rute admin dibagi dua grup:** `(admin)/admin/login` tanpa AdminShell, dan `(admin)/admin/(panel)/*` dengan AdminShell dan pengecekan sesi di layout.
8. **Pembatasan login:** 5 percobaan gagal per username dalam 15 menit (tabel `PercobaanLogin`). Pesan galat sama untuk username salah, password salah, dan akun nonaktif.
9. **Rute OAuth Drive** (`api/v1/admin/google-drive/{status,hubungkan,callback,putuskan,uji}`) khusus `superadmin`. `state` OAuth disimpan di cookie httpOnly dan dicocokkan di callback. Tanpa `GOOGLE_DRIVE_CLIENT_ID/SECRET`, `hubungkan` menjawab 503 `NOT_CONFIGURED`.
10. **Migrasi RLS (7.2) dikerjakan di B0**, karena hanya relevan untuk Supabase.
11. **Seed idempoten dan tidak menimpa perubahan panitia** (`prisma/seed-lib.ts`): jurusan, mapel, bobot, dan form field hanya dibuat bila belum ada. FAQ awal hanya dimasukkan bila tabel kosong dan harus ditinjau sekolah (isinya fakta dari PRD, tanpa tanggal).
12. **Field `alamat` (langkah 5) dan `alamat_ortu` (langkah 6) ditambahkan** ke seed form field. Lampiran 23.3 tidak mencantumkannya padahal kolomnya ada di 23.6. Akta dan KK default opsional (keputusan S5 belum final).
13. **Indeks `pg_trgm` untuk pencarian nama ditunda ke A6.** A2 memakai indeks biasa pada `namaLengkap`. Cari ekstensi `pg_trgm` di Postgres lokal sebelum A6.
14. **Kolom sensitif Pendaftar** (`nik`, `noKk`, `noHp`, `noWa`, `noHpOrtu`) bertipe `String` berisi teks terenkripsi; pencarian NIK lewat `nikHash` (HMAC).
15. **Aset foto landing** diambil dari situs sekolah (smkmanu1wangon.sch.id), diolah ke WebP oleh `scripts/olah-gambar.mjs` ke `public/images/sekolah/` (sumber mentah di `.local/aset-mentah`, tidak di-commit). Foto jurusan tersedia untuk MPLB dan TKR; AKL dan FKK memakai bentuk besar dan ikon sampai sekolah menyediakan foto. **Foto ditampilkan dengan warna asli, tanpa filter atau duotone** (lihat butir 19).
16. **Copy landing bersifat usulan** (keputusan S14 belum final): judul "Belajar terampil, tumbuh berakhlak.", tagline "SMK Pusat Keunggulan" (dari logo resmi), dan keterangan foto. Bagian sambutan kepala sekolah, berita, agenda, dan testimoni disembunyikan sampai datanya ada (nama dan sambutan kepala sekolah belum diketahui).
17. **Aturan CTA landing:** satu label per maksud ("Daftar Sekarang", "Cek Status"), tombol utama hijau di hero dan penutup, tombol navbar hijau. Bagian simulasi saran jurusan diganti tes minat-bakat landing (butir 53); rekomendasi berbasis nilai rapor tetap hanya bagian dari alur pendaftaran.
18. **GSAP dimuat lazy** lewat `useGsapPublik` (import() setelah hidrasi) dan hanya di komponen `src/features/landing`. Bagian program keahlian di-pin pada layar >= 1024 px: gulir vertikal menggeser panel ke samping (scroll horizontal GSAP) dengan bar progres dan parallax foto; di bawah 1024 px atau reduced motion, panel tersusun vertikal (keputusan pemilik proyek 20 Okt 2026, mengembalikan animasi dan membatalkan scroll native dengan snap; isi konten tetap versi terbaru). Setelah semua bagian animasi dipasang, hook memanggil `ScrollTrigger.sort()` dan `refresh()` sekali (debounce). Jangan meneruskan instance ScrollTrigger ke tween lain (menggandakan pin).
19. **Perubahan arah visual atas permintaan pemilik proyek (11 Okt 2026), menggantikan PRD v3.1 16.2 dan 16.5 untuk situs publik** (bagian font dan palet di bawah sudah digantikan butir 38; foto, motion, dan dial tetap berlaku):
    - **Font:** Clash Display (judul) dan Satoshi (isi), self-host dari Fontshare di `src/app/fonts` (lisensi gratis komersial). Menggantikan Bricolage Grotesque dan Plus Jakarta Sans. Tetap maksimal dua keluarga font.
    - **Palet:** hijau NU dipertahankan sebagai warna merek, ditambah tinta pekat `ink`, kuning sekolah `kuning` (menggantikan emas sebagai `aksen`), `mint`, dan `jingga`. Bagian halaman berganti latar (krem, tinta, kuning, mint, hijau) agar tidak monoton hijau.
    - **Foto:** warna asli, tanpa duotone, tanpa overlay hijau. Foto kecil (700 px) tidak diperbesar melebihi ukuran aslinya.
    - **Motion landing (dial naik dari 6 ke 9 dari 10):** gulir halus Lenis (dependensi baru `lenis`, hanya di layout publik) disinkronkan dengan ScrollTrigger; tirai pembuka sekali per sesi; hero dengan SplitText dan foto yang mengembang jadi layar penuh (pin); kalimat yang terbuka kata demi kata saat digulir; satu marquee dengan laju dan kemiringan mengikuti kecepatan gulir; scroll horizontal untuk program keahlian; kartu alur bertumpuk (sticky stack); foto galeri dengan klip dan parallax; hitung naik skor contoh; tombol magnetik; bilah progres gulir. Semua mati bila `prefers-reduced-motion`. Wizard dan admin tetap tenang (dial 2 dan 1).

20. **CRUD konten generik** (`src/server/actions/konten.ts`, `src/app/api/_lib/konten.ts`): satu implementasi untuk berita, event, galeri, testimoni, dan FAQ. HTML berita disanitasi saat disimpan (`sanitize-html`, daftar putih ketat). Slug dibuat dari judul dan tidak berubah saat judul diedit. Setiap buat/ubah/hapus dicatat di audit log. Peran: konten dan superadmin untuk lima entitas itu; jurusan dan pengaturan hanya superadmin. Pengaturan hanya menerima kunci yang dikenal (`SKEMA_PENGATURAN`); kunci rahasia seperti token Drive tidak bisa diubah lewat sini.
21. **Halaman admin memeriksa peran di server** (`wajibPeranHalaman`): peran tidak cocok diarahkan ke dashboard dengan pesan. Rute API tetap menjawab 401/403.

22. **Lebar konten situs publik (`wadah`)** (permintaan pemilik proyek, 12 Okt 2026): kelas CSS `.wadah` di `globals.css` memakai variabel `--pad` (1,5 rem HP, 2,5 rem tablet, 4 rem laptop, 5 rem layar lebar; konten maksimal 84 rem). Dipakai navbar, footer, landing, jurusan, dan berita, sehingga margin tiap sisi sekitar 90 px di laptop 1366 dan 130 px di layar 1440. `.sejajar-wadah` untuk elemen di luar wadah yang harus sejajar dengannya (jalur scroll horizontal program). Ditulis sebagai kelas biasa, bukan `@utility`, karena `@utility` dengan media query bersarang tidak terkompilasi di Tailwind v4 + Turbopack proyek ini.
23. **Hero:** judul maksimal 3,9 rem, foto dimulai tepat di bawah blok teks (tinggi diukur ResizeObserver ke variabel `--teks`) dan sejajar dengan wadah. Saat digulir foto membesar ke tengah area layar dan berhenti dengan margin samping yang sama dengan teks (tidak sampai tepi layar; atas dan bawah sama besar). Nilai awal dan akhir clip-path untuk animasi ditulis eksplisit 4 sisi dalam px, karena browser menyederhanakan `inset(a b c b)` menjadi 3 nilai sehingga GSAP salah menginterpolasi sisi kiri dan kanan. Durasi tween timeline harus ditulis eksplisit (durasi bawaan GSAP 0,5 detik mengubah panjang timeline).
24. **Berkas sementara wizard saat dev** (A4, disetujui pemilik proyek): bila `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` kosong dan bukan produksi, `penyimpananTemp()` memakai `DriverLokal` (`.local/draf-temp`, bisa diganti `DRAF_TEMP_DIR`). Di produksi tanpa Supabase melempar galat. Fase B cukup mengisi env Supabase, kode tidak berubah.
25. **Draf dan submit (A4):** isian draf disimpan terenkripsi AES-GCM dalam satu blob per langkah (`{"1": {...}}`), berkas di kolom `berkas`. `langkahTerakhir` = langkah terjauh yang boleh dibuka (mulai 1). Idempotensi submit **tanpa header `Idempotency-Key`**: baris draf dikunci `SELECT ... FOR UPDATE` di transaksi dan hasil (nomor + token akses, terenkripsi) disimpan di draf, sehingga klik ganda mengembalikan hasil yang sama. Nomor `SPMB-{TAHUN}-{NNNN}` (awalan SPMB, tahun = tahun pertama `tahun_ajaran`) dengan `pg_advisory_xact_lock`. Berkas dipindah ke Drive sesudah commit secara best-effort; bila Drive belum terhubung `berkasSinkron` tetap `menunggu` dan referensi berkas sementara ada di `berkasMeta` (sinkron ulang = A6/Fase B).
26. **Pengaturan baru dibaca wizard:** `gelombang_buka`, `gelombang_tutup` (YYYY-MM-DD, kosong = selalu buka) dan `semester_rapor` (bawaan `1,2,3,4,5`). Kunci ini sudah ada di formulir Pengaturan admin (A3); format tanggal kini wajib `YYYY-MM-DD`. `teks_persyaratan`, `teks_persetujuan` (menggantikan teks bawaan di langkah 1), dan `wa_group_url` (tombol di halaman sukses) ikut dibaca wizard. Tanggal verifikasi untuk tanda terima memakai `tanggal_verifikasi_fisik` (bukan `tanggal_verifikasi` di butir 28). `tahun_ajaran` kosong memakai bawaan (mulai Oktober = tahun ajaran berikutnya).
27. **Aturan wizard saat A4:** tabel nilai rapor hanya menampilkan mapel yang punya bobot di jurusan aktif, dengan minimal satu semester per mapel (PRD v3.1 10.4). Kewajiban nilai ini diubah menjadi opsional oleh keputusan 45. Pilihan jurusan 1 terisi awal dengan saran teratas bila tersedia. `Kembali` tidak menyimpan isian langkah yang sedang dibuka (hanya langkah yang sudah disimpan yang tersimpan). Jenis berkas dideteksi dari isi (magic bytes), bukan dari nama atau MIME klien. Cek status dibatasi 10 per menit per IP memakai tabel `PercobaanLogin` (penanda `cek:{ip}`).
28. **PDF formulir (15.1) dikerjakan atas permintaan pemilik proyek, 11 Okt 2026**, mendahului A6. Pas photo, Petugas, dan Tanda Tangan dibiarkan kosong. Kunci pengaturan baru dibaca: `tanggal_verifikasi` (YYYY-MM-DD, opsional).
29. **A6 tahap 1 (admin):** ~~`mustChangePassword` ditegakkan lewat klaim `mcp` di JWT~~ **dicabut oleh keputusan 37**: ganti password tidak lagi dipaksa. Halaman `/admin/ganti-password` tetap ada sebagai menu sukarela dan menerbitkan token baru. Kebijakan password: min 10 karakter, ada huruf dan angka, beda dari lama. Menu sidebar dari `menu-admin.ts` per peran dan menyembunyikan item yang halamannya belum siap. e2e memakai akun uji `e2e-*` (password acak) yang dihapus `global-teardown.ts`, bukan akun superadmin asli. Dashboard memakai periode dari `tahun_ajaran`; grafik murni CSS.
30. **A6 tahap 2 (data peserta):** daftar di `/admin/peserta` (filter lewat GET, paginasi 20, bawaan periode aktif, `periode=semua` untuk semua), detail `/admin/peserta/[id]`, ubah `/admin/peserta/[id]/ubah` dengan aturan validasi wizard (langkah 1, 4, 5, 6, 7) dan audit data lama/baru (nilai sensitif tersamarkan di audit). Pencarian HP lewat kolom baru `noHpHash` (HMAC dari nomor kanonik 08..., migrasi `pendaftar_hp_hash`); NIK lewat `nikHash`. Pemetaan field ke kolom dipusatkan di `pendaftarKolom.ts` (dipakai submit, edit, input manual). Indeks `pg_trgm` tersedia di Postgres lokal tetapi tidak dipakai: `ILIKE` cukup untuk volume ratusan sampai ribuan pendaftar; aktifkan bila lambat. Tabel dengan `<caption class="sr-only">` harus dibungkus elemen `relative` agar caption tidak melebarkan halaman. Setelah `prisma generate`/migrasi, restart dev server.
31. **A6 tahap 3 (verifikasi):** `/admin/verifikasi` (antrean pending, paling lama dulu) dan `/admin/verifikasi/[id]` (kiri penampil berkas, kanan data, tabel nilai, keputusan). Berkas selalu lewat `GET /api/v1/admin/peserta/[id]/berkas` (tanpa URL publik): dari Drive bila `*FileId` ada, selain itu dari penyimpanan sementara dengan label "Menunggu unggah ke Drive"; setiap pembukaan diaudit (`pendaftar.berkas_lihat`). Keputusan: setujui, revisi (catatan wajib min 5 karakter), tolak (alasan wajib); catatan tampil di Cek Status; menyetujui menghapus catatan lama. "Nilai sesuai" atau koreksi sel: koreksi menghitung ulang saran jurusan dengan bobot saat itu (versi baru), `nilaiRaporKoreksi.asli` menyimpan nilai asli sekali, sumber `ocr` menjadi `ocr_dikoreksi`. Sinkron ulang ke Drive per pendaftar dan massal (maks 25 per klik, dari data peserta dengan filter sinkron menunggu/gagal); gagal menandai `gagal` tanpa menghapus berkas sementara. Penampil berkas diuji dengan Drive tiruan di memori (uji Drive nyata tetap menunggu kredensial).
32. **A6 tahap 4 (operasional):** `/admin/kuota` (edit massal satu transaksi, 0-1000, audit lama/baru); definisi "terdaftar" satu tempat (`services/kuota.ts`): pilihan 1, periode aktif, tanpa yang ditolak, dipakai dashboard, halaman kuota, dan info kuota penuh di wizard. `/admin/input-manual`: isian sama dengan wizard (langkah 1, 4, 5, 6, 7) tanpa persetujuan, nilai rapor opsional (saran jurusan dihitung bila ada; status nilai `sesuai` bila diisi), status awal Diterima atau Menunggu, `sumber = luring`, nomor dari `nomorBerikut` yang sama dengan wizard. Berkas dikelola dari detail pendaftar (`POST/DELETE /api/v1/admin/peserta/[id]/berkas`): ganti akta/KK, tambah rapor (maks 10), hapus; isi diperiksa dari byte; berkas di Drive ikut dihapus dari Drive saat diganti atau dihapus; setelah unggah langsung dicoba sinkron. `pindahkanKeDrive(nomor)` kini hanya memindahkan berkas yang belum punya ID Drive (aman diulang). Panel Drive di Pengaturan menampilkan jumlah menunggu/gagal dan tombol sinkron massal.
33. **A6 tahap 5 (sistem):** editor bobot per jurusan dengan pratinjau skor langsung (rumus murni `validasi/peringkat.ts` dipakai server dan klien), bobot tidak harus berjumlah 1 (skor dibagi total bobot tersedia), simpan mengubah versi bobot tetapi tidak menyentuh skor pendaftar lama. CRUD mata pelajaran (kode tak bisa diganti, alias huruf kecil unik, hapus hanya bila tidak dipakai bobot). Form builder (`/admin/isian-formulir`): ubah label, bantuan, tampil, wajib, urutan, pilihan; tambah isian kustom di langkah 2 (berkas), 5, 6, 7 dengan kunci `kustom_{slug}`; jawaban masuk `dataKustom`, berkas kustom masuk `kustomFileIds`. Isian inti (`KUNCI_INTI`: nama, NISN, tanggal lahir, setuju, jurusan_1, rapor, nilai_rapor, konfirmasi_final) selalu tampil dan wajib walau tabel diubah langsung. Isian kustom tidak ikut tercetak di PDF formulir (mengikuti template). Akun admin (superadmin): buat dengan password sementara 14 karakter yang tampil sekali, ubah nama/peran, nonaktifkan, reset password; tidak bisa menonaktifkan atau mengubah peran diri sendiri; selalu tersisa minimal satu superadmin aktif. **Sesi kini diverifikasi ke database di `ambilSesiAdmin`** (akun harus ada dan aktif; peran, nama, dan `mustChangePassword` dibaca dari DB), sehingga penonaktifan, perubahan peran, dan reset password langsung berlaku pada sesi yang sedang berjalan. Audit log (`/admin/audit-log`, filter aksi/pelaku/objek/tanggal, 30 per halaman), login kini diaudit. Statistik OCR membaca `OcrHasil` (kosong sampai A5).
34. **Sisa A3 (11 Okt 2026):** (a) Landing membaca berita (3 terbit terbaru), agenda mendatang (3), galeri (5), testimoni (4) lewat `ambilDataLanding`; komponen `KabarTerbaru` dan `TestimoniLanding` hilang sendiri bila kosong; `KehidupanSekolah` memakai galeri admin menampilkan lima foto bawaan lalu foto galeri admin di belakangnya (foto admin menambah, tidak menggantikan; revisi 21 Okt 2026). Bila admin memuat foto bawaan ke galeri (tombol di halaman Galeri), isi galeri menjadi acuan tunggal supaya foto bawaan bisa diurutkan atau dihapus. Maksimal 20 foto galeri aktif tampil. (b) Unggah gambar konten: `POST /api/v1/admin/media` (peran konten dan superadmin), `services/media.ts`: isi diperiksa dari byte (JPG, PNG, WebP, maks 5 MB, PDF dan HTML bertopeng gambar ditolak). Bucket publik Supabase `konten-publik` bila env diisi; tanpa Supabase dan bukan produksi, disimpan di `public/uploads/konten` (di-gitignore, tidak untuk produksi: tanpa Supabase unggah menjawab 503). Gambar lama dihapus otomatis saat diganti atau barisnya dihapus (hanya gambar hasil unggah, alamat luar tidak disentuh). `next.config.ts` menambah `images.remotePatterns` untuk host Supabase dari env. (c) Endpoint JSON publik tanpa login, cache `public, s-maxage`: `GET /api/v1/landing`, `/jurusan`, `/jurusan/[kode]`, `/berita` (`?batas=`), `/berita/[slug]`, `/faq` (tanpa kata kunci internal), `/mapel` (tanpa alias), `/form-schema` (isian tampil per langkah beserta jadwal). Pencarian FAQ (`?q=`) masuk A8.
35. **A7 dokumen keluaran (11 Okt 2026):** (a) **Ekspor XLSX** (`services/xlsx.ts`, `exceljs`): satu sheet "Data Pendaftar", header hijau `#057A3C` teks putih tebal, panel beku, filter otomatis; semua kolom Bagian A-D, alamat terurai, rata-rata nilai rapor per mapel aktif dan keseluruhan, status nilai, saran dan skor per jurusan, pilihan 1 dan 2, status, sumber, tanggal, isian kustom; NIK, NISN, nomor HP, RT/RW sebagai teks; label opsi (jenis kelamin, penghasilan) dari form builder. Maksimal 10.000 baris. (b) **Rekap PDF** (`services/pdf/rekap.ts`, `pdf-lib`): A4 landscape, kop sekolah, subjudul filter dan jumlah, tabel dengan kepala diulang tiap halaman, "Halaman x dari y", blok tanda tangan Ketua Panitia; maksimal 5.000 baris. (c) Filter dipakai bersama daftar peserta (`services/pencarianPeserta.ts`); halaman `/admin/ekspor` (menu "Ekspor Data") dan tautan "Ekspor hasil filter ini" di Data Peserta; endpoint `GET /api/v1/admin/ekspor/xlsx` dan `/rekap`; setiap ekspor diaudit (`pendaftar.ekspor`, memuat filter dan jumlah). (d) **Email kode pendaftaran** (`server/email/`, `resend`): dikirim setelah submit bila pendaftar mengisi email; berisi nomor, ringkasan, tautan halaman sukses bertoken, unduh formulir, Cek Status, grup WA (hanya https), daftar berkas fisik, tanggal verifikasi; semua nilai pengguna di-escape. Sekali kirim (`notifikasiEmailAt`); gagal tidak menggagalkan pendaftaran. Tanpa `RESEND_API_KEY` dilewati. Domain pengirim `RESEND_FROM` perlu diverifikasi saat go-live (Fase B). Email status ke pendaftar tetap ditunda. (e) **Cron** (`services/cron.ts`, `vercel.json`): satu tugas harian `/api/v1/cron/harian` (02:00 WIB) karena Vercel Hobby hanya mengizinkan cron harian; menjalankan berurutan bersih draf kedaluwarsa (berkas sementara hanya dihapus untuk draf yang belum dikirim), ulangi sinkron Drive (bila terhubung), kirim ulang email tertunda (14 hari, tanpa tautan bertoken karena token mentah tidak disimpan); endpoint terpisah `bersih-draf`, `retry-drive`, `retry-email` untuk pemicu manual. Dilindungi `Authorization: Bearer CRON_SECRET` (min 16 karakter, banding waktu-konstan; tanpa rahasia = 503). **Belum:** cek kuota Drive dengan email peringatan, dan ringkasan mingguan (perlu pengaturan alamat email panitia, ditunda). (f) Sidebar admin kini tetap di tempat saat halaman digulir dan punya gulir sendiri di layar pendek (perbaikan keluhan pemilik proyek).
36. **A8 Tanya Sunan (chatbot) dengan cadangan Gemini (11 Okt 2026, atas permintaan pemilik proyek; mengubah aturan "OCR satu-satunya fitur cerdas"):** widget mengambang `TanyaPanitia` di semua halaman publik dan wizard (tidak di admin), `POST /api/v1/tanya`, dan `GET /api/v1/faq?q=`. Urutan jawaban di `services/tanyaPanitia.ts`: (1) **aturan** dari data situs: sapaan, jadwal (pengaturan gelombang), kuota dan sisa, daftar jurusan, kontak dan alamat, persyaratan (teks pengaturan); (2) **FAQ**: pengakaran ringan Bahasa Indonesia, stopword, Jaccard (PRD 10.8, ambang 0,1) ditambah syarat cakupan kata kueri berbobot kelangkaan (idf) minimal 0,5 supaya kata umum seperti "daftar" tidak mengalahkan kata khas seperti "syarat" dan pertanyaan di luar FAQ tidak dijawab sembarangan; (3) **Gemini** hanya bila `GEMINI_API_KEY` ada dan pertanyaan tidak cocok: panggilan REST langsung (`services/gemini.ts`, tanpa SDK, model dari `GEMINI_MODEL` bawaan `gemini-2.5-flash`, kunci lewat header, suhu 0,2, maks 500 token, batas waktu 9 detik) dengan instruksi sistem berisi informasi resmi (jadwal, jurusan beserta sisa kuota, alur, FAQ, persyaratan, kontak) yang memerintahkan menjawab hanya dari informasi itu, tidak mengarang, tidak meminta data pribadi, dan memperlakukan teks pengguna sebagai data (anti injeksi); hanya teks pertanyaan dan konteks sekolah yang dikirim, tidak pernah data pendaftar atau IP; (4) bila semua gagal atau diblokir: arahan ke kontak panitia. UI selalu menandai jawaban AI ("Dijawab asisten AI ... bisa keliru"), menampilkan pertanyaan terkait, dan mengingatkan jangan menulis data pribadi. Pengaman: pertanyaan 2-300 karakter, 30 pertanyaan per IP per 10 menit (429), 8 panggilan AI per IP per 10 menit, dan batas harian situs `GEMINI_BATAS_HARIAN` (bawaan 300), memakai tabel `PercobaanLogin` (penanda `tanya:` dan `tanyaai:`, dibersihkan cron harian setelah 2 hari). Teks pertanyaan tidak disimpan. Tanpa kunci Gemini sistem tetap berfungsi penuh (aturan + FAQ). Uji memakai `fetch` tiruan; panggilan Gemini nyata menunggu kunci dari pemilik proyek. Menyunting FAQ lewat menu FAQ admin langsung memengaruhi jawaban chatbot (kolom kata kunci dipakai pencocokan).
37. **Ganti password admin tidak lagi wajib (12 Okt 2026, atas permintaan pemilik proyek; mencabut bagian penegakan di butir 29):** login langsung masuk panel. Dihapus: klaim `mcp` di JWT, guard 403 `PASSWORD_CHANGE_REQUIRED`, pengalihan ke `/admin/ganti-password`, field `wajibGantiPassword` di respons login dan `/admin/me`, lencana "Belum ganti password" di `/admin/akun`. Kolom `User.mustChangePassword` dibiarkan tetapi tidak ditulis dan tidak dibaca. Password sementara akun baru atau hasil reset kini berlaku seterusnya sampai pemiliknya menggantinya sendiri lewat menu. **Konsekuensi yang diterima:** password superadmin awal dari `.env` (seed) tidak lagi dipaksa ganti, jadi wajib kuat dan unik di produksi (B0 sampai B2), dan sesi lama tidak lagi terkunci saat password direset superadmin (berlaku sampai token 8 jam habis).
38. **Arah visual baru: palet "Daun Zaitun" dan font Poppins (12 Okt 2026, atas permintaan pemilik proyek setelah ditinjau tim; menggantikan bagian font dan palet butir 19 serta butir 17 soal CTA kuning).** Detail lengkap dan tabel kontras di `docs/design/DESIGN.md`.
    - **Palet empat warna hijau di atas krem netral:** hijau gelap `#123524` (`ink`, `tinta`), hijau primer `#387324` (`primer`; `#3E7B27` dicoba lebih dulu, digelapkan sedikit agar teks krem di atasnya dan teks primer di atas krem lolos AA), hijau muda `#85A947` (token `kuning`/`aksen`/`jingga`/`emas`, nama lama dipertahankan agar komponen tidak berubah), krem netral `#F2EFE6` (`kertas`, `latar`; krem kekuningan `#EFE3C2` dan putih dicoba lalu ditolak tim karena terlalu hangat dan terlalu terang). Token baru: `hijau-hutan` `#1B4630` (latar bagian pernyataan) dan `hijau-terang` `#A3C960` (sorotan di atasnya); `mint` kini `#C5D89D`. Opacity awal kata di bagian pernyataan dinaikkan ke 0,65 dan tahap redup panel cek status ke 0,7, karena axe menghitung teks yang diredupkan animasi dan latar hijau baru lebih terang dari tinta lama.
    - **Font:** satu keluarga Poppins 400-700 lewat `next/font/google` (di-host sendiri saat build), menggantikan Clash Display dan Satoshi. Ekor huruf Poppins lebih panjang: judul hero memakai tinggi baris 1,15, dan topeng SplitText diberi kelas `baris`/`kata` yang area potongnya diperluas 0,14em di `globals.css` (selektor atribut `[style*=...]` dicoba lebih dulu tetapi hilang di CSS hasil Turbopack).
    - **Tombol:** semua "Daftar Sekarang" memakai varian `utama` (hijau), tidak lagi `aksen` kuning. Varian baru `bingkai` untuk "Cek Status" di hero: garis tepi saja, terisi hijau gelap saat disorot, diklik, atau difokus.
    - **Tata letak dan foto:** galeri kehidupan sekolah disusun ulang menjadi baris berpasangan bertepi sejajar (7/5, 5/7, lalu satu foto lebar). Keempat jurusan kini punya foto (AKL dan FKK kiriman sekolah, menggantikan bentuk dan ikon di butir 15), dengan titik fokus per foto lewat kolom `posisi`. Logo diganti `logo-sekolah.png` dari berkas logo resmi berlatar transparan. Marquee jurusan berlatar `mint`; tulisan kode TKR putih.
    - **Belum diselaraskan:** template email, `themeColor`, swatch katalog, tema gelap, dan favicon masih memakai warna atau logo lama (daftar di DESIGN.md).
39. **OCR dipindah ke browser dengan PaddleOCR; Google Vision tidak dipakai (13 Okt 2026, atas permintaan pemilik proyek; menggantikan butir tabel 6 dan seluruh Bagian 11 versi Vision, mencabut kebutuhan `GOOGLE_CLOUD_VISION_API_KEY`):**
    - **Alasan:** gratis tanpa kuota, tanpa server (sesuai tujuan hampir tanpa biaya), dan foto KK (memuat NIK seluruh keluarga) tidak keluar dari HP pendaftar. Keputusan diambil setelah spike: pada gambar dokumen sintetis PaddleOCR membaca KK, akta, dan rapor (35 sel nilai) dengan benar saat gambar bersih atau terkompres, sedangkan Tesseract gagal pada tabel; pada foto KK asli di HP Android 10 (8 inti, 4 GB) nomor KK dan tiga dari empat NIK benar, satu NIK kehilangan satu digit.
    - **Konsep:** OCR hanya bantuan untuk Akta dan KK. Foto dibaca di browser, hasilnya tampil sebagai isian yang bisa diedit, dan **kalau gagal atau kurang jelas pendaftar mengisi manual**. Nilai rapor hanya diisi manual (keputusan 52). PDF tidak dibaca otomatis. Detail di Bagian 11.
    - **Teknis:** `ppu-paddle-ocr` + `onnxruntime-web` (build WASM lewat `turbopack.resolveAlias`); model tiny di `public/ocr/model` (di-commit, ±6,4 MB), runtime WASM disalin ke `public/ocr/ort` oleh `scripts/salin-wasm-ocr.mjs` pada `postinstall` (tidak di-commit). Foto diperkecil dan dikompres di browser sebelum diunggah (butir yang tertunda dari v3.1 10.4), sehingga foto kamera HP tidak lagi terhenti di batas 5 MB.
    - **Dampak ke data:** `OcrHasil.provider` bawaan `paddleocr`; tabel itu tidak menyimpan nilai hasil bacaan (data pribadi), hanya jenis, sukses, durasi, dan keyakinan per field. `Pendaftar.nilaiRaporSumber` menyimpan `manual` untuk pendaftaran baru; nilai historis `ocr` dan `ocr_dikoreksi` tetap dipertahankan. Statistik OCR tidak lagi menampilkan kuota.
40. **Foto rapor tidak diunggah dan tidak disimpan; hanya nilainya yang dipakai (13 Okt 2026, atas permintaan pemilik proyek; mengubah v3.1 Langkah 3 "berkas rapor tetap wajib diunggah sebagai bukti"):**
  - **Alur:** Langkah 3 tidak menerima foto rapor. Pendaftar mengisi tabel nilai secara manual dan boleh mengosongkan seluruh atau sebagian nilainya (keputusan 45). Nilai yang diisi dapat dicocokkan dengan rapor asli saat verifikasi berkas fisik atau daftar ulang.
    - **Dihapus:** field form builder `rapor` (tipe file; migration `20261013150000_hapus_field_berkas_rapor`), kunci `rapor` di `KUNCI_INTI` dan `KUNCI_FILE_KHUSUS`, batas 10 berkas rapor, unggah rapor oleh admin (`KUNCI_ADMIN`), dan pemindahan rapor ke Drive. Kolom `Pendaftar.raporFileIds` dibiarkan (data lama, tidak ditulis lagi); penampil admin masih menampilkan dan bisa menghapus berkas rapor lama bila ada.
    - **Konsekuensi yang diterima:** panitia tidak punya foto rapor di sistem untuk dicocokkan dengan nilai yang diisi. Pencocokan dilakukan dengan rapor asli saat verifikasi berkas fisik atau daftar ulang. Foto rapor sebagai data pribadi anak tidak pernah dikirim atau disimpan.
  41. **Warna program keahlian di situs publik (17 Okt 2026, permintaan pemilik proyek):** AKL memakai hijau primer dengan aksen kuning kunyit; LPK3 memakai pink; TKR memakai biru; MPLB tetap mint. Warna diterapkan konsisten pada panel landing, hasil tes minat-bakat, marquee, dan halaman detail jurusan. Nilai warna dan rasio kontras ada di `docs/design/DESIGN.md`.
  42. **Revisi sekolah, putaran 2 (20 Okt 2026, permintaan pemilik proyek):** (a) satu pilihan jurusan saja: field `jurusan_2` dan `nilai_ujian` dihapus dari form (seed menghapusnya dari basis data lama; kolom Prisma tetap ada dan boleh kosong, data lama tetap tampil di admin dan PDF); (b) tiap field punya keterangan dan contoh penulisan (`teksBantuan`, `placeholder`; seed hanya mengisi yang masih kosong, tidak menimpa suntingan panitia); field opsional diberi tulisan "(opsional)" di labelnya; (c) tinggi dan berat badan tanpa satuan di label; label "Nama sekolah asal"; (d) galeri "Kehidupan sekolah" di landing berupa slider geser (scroll-snap native, tombol sebelumnya/berikutnya, tanpa scrollbar tampak); (e) pas foto dibawa langsung, keterangan latar dan seragam ada di `src/lib/berkas-fisik.ts` dan tampil di langkah 2 serta email (nilai latar merah dan seragam sekolah asal adalah asumsi, perlu dikonfirmasi sekolah); (f) halaman sukses menegaskan "Wajib bergabung ke grup WhatsApp" (tidak bisa dipaksa teknis, hanya ditegaskan); (g) judul situs dan email memakai "Pendaftaran Murid Baru SPMB". (h) "Nama sekolah asal" (`asal_sekolah`) pindah dari langkah 5 ke langkah 7 bersama data sekolah asal lain; seed memindahkan baris lama otomatis. (i) Kartu wajib grup WhatsApp ditaruh tepat di bawah kartu nomor pendaftaran. (j) Seed mengganti nama FKK menjadi LPK3 pada basis data lama (bukan jurusan tambahan; pendaftar dan bobot ikut). Bagian program keahlian tetap di-pin (butir 18).
  44. **Gelombang pendaftaran (21 Okt 2026, permintaan sekolah: total sekitar 300 pendaftar, 3 gelombang, jangka 3 bulan, gelombang terakhir singkat 2-3 hari berkuota 40-50):** tabel `Gelombang` per tahun ajaran (nama, tanggal buka dan tutup `YYYY-MM-DD`, kuota opsional, aktif) dan kolom `Pendaftar.gelombangId`. Halaman `/admin/gelombang` (peran pendaftar) mengelola gelombang; tanggal aktif tidak boleh tumpang tindih; gelombang yang sudah punya pendaftar tidak bisa dihapus (dinonaktifkan saja). Aturan buka: pendaftaran terbuka bila hari ini (WIB) ada di rentang gelombang aktif dan kuotanya belum penuh (pendaftar ditolak tidak dihitung). Bila semua gelombang lewat atau gelombang berjalan penuh, wizard tertutup dengan pesan yang menyebut gelombang berikutnya. Saat submit, pendaftar dicatat ke gelombang yang berjalan di dalam transaksi berkunci (kuota tidak bisa terlampaui oleh kirim bersamaan). Input manual panitia ikut gelombang berjalan tetapi tidak diblokir kuota. Bila belum ada gelombang sama sekali, perilaku lama tetap berlaku (`gelombang_buka` dan `gelombang_tutup` di Pengaturan). Jadwal dan sisa kuota gelombang tampil di landing, halaman Daftar, Tanya Sunan, kolom "Gelombang" di ekspor XLSX, dan halaman sukses.
  43. **Pas foto diunggah di form (20 Okt 2026, permintaan pemilik proyek; membatalkan keterangan pas foto fisik di butir 42e):** field `pas_foto` (langkah 2, opsional, hanya gambar) dengan petunjuk latar dan seragam yang bisa disunting panitia di form builder. Foto ikut disinkron ke Drive seperti berkas lain dan ditempel otomatis ke kotak "Pas photo 3 x 4" di halaman 2 PDF formulir (`KOTAK_PAS_FOTO` di `pdf/formulir.ts`, dipotong ke kotak, EXIF diputar). Lapisan tetap template tidak berubah; tanpa foto, PDF sama seperti sebelumnya.
  42. **Field nomor ijazah dihapus dari pendaftaran (17 Okt 2026, permintaan pemilik proyek):** hapus `no_ijazah` dan `ijazah_nomor_tahun` dari form builder dan wizard. Kolom pada `Pendaftar` dipertahankan untuk kompatibilitas data lama dan template PDF resmi tidak diubah.
  43. **Tanggal lahir hanya diinput sekali (17 Okt 2026, permintaan pemilik proyek):** pendaftar mengisi tanggal lahir di langkah 1. Langkah data murid menampilkan tanggal yang sama sebagai field baca-saja dari langkah 1, bukan input atau nilai kedua.
  44. **Jurusan kefarmasian berganti kode dan nama (17 Okt 2026, permintaan pemilik proyek):** kode `FKK` diubah menjadi `LPK3`, nama menjadi “Layanan Penunjang Kefarmasian Klinis dan Komunitas”. Bobot, kuota, warna pink, panel, rekomendasi, PDF, dan data tersimpan mengikuti kode baru. Draf lama yang masih menyimpan pilihan `FKK` dibaca sebagai `LPK3` sampai kedaluwarsa; `docs/arsip/PRD-v3.1.md` dan template resmi tetap menjadi rekaman historis.
  45. **Ijazah dan nilai rapor opsional (17 Okt 2026, permintaan pemilik proyek):** nomor ijazah tidak dikumpulkan dan tidak ada unggahan ijazah online; ijazah fisik pada daftar email bersifat opsional. Nilai rapor boleh kosong atau sebagian. Bila ada nilai, rekomendasi tetap dihitung; bila kosong seluruhnya, rekomendasi/skor tidak dibuat dan pendaftar memilih jurusan sendiri. Pilihan jurusan tetap wajib.
  46. **Pilihan sumber informasi pendaftar (17 Okt 2026, permintaan pemilik proyek):** field “Mengetahui sekolah ini dari” wajib dipilih, menyediakan saran Teman/saudara/keluarga, Sosmed, Alumni, Sosialisasi SPMB, dan Lainnya (tulis sendiri). Bila memilih Lainnya, teksnya wajib diisi. Nilai tetap disimpan sebagai teks bebas pada field yang sama.
  47. **Format rentang penghasilan dirapikan (17 Okt 2026, permintaan pemilik proyek):** label rentang memakai satu awalan `Rp` dan tanda rentang en dash, tanpa mengubah kode pilihan atau batas nominal.
  48. **NIK ayah dan ibu diperlukan (17 Okt 2026, permintaan pemilik proyek):** tambahkan field wajib 16 digit pada langkah data orang tua. Nilai disimpan terenkripsi AES-256-GCM, ditampilkan kepada admin berwenang, dan diekspor sebagai teks; tidak ditambahkan ke PDF karena template resmi tetap tidak diubah.
  49. **Kapitalisasi penuh input teks (17 Okt 2026, permintaan pemilik proyek):** semua huruf yang diketik pada isian teks bebas pendaftaran otomatis menjadi kapital, termasuk koreksi data OCR dan email. Input angka/tanggal, nilai yang sudah ada sebelum diedit, serta opsi radio/select tidak diubah.
  50. **Tempat dan tanggal lahir orang tua dipisah (17 Okt 2026, permintaan pemilik proyek):** langkah data orang tua memakai field tempat lahir dan tanggal lahir terpisah untuk ayah dan ibu. Kolom TTL lama dipertahankan untuk data terdahulu; PDF resmi tetap menggabungkan keduanya ke slot TTL yang sama.
  51. **Scroll program keahlian (17 Okt 2026, permintaan pemilik proyek):** kartu jurusan tetap bisa digulir mendatar dengan scrollbar, trackpad, atau swipe, sementara halaman tetap bisa digulir vertikal; bagian ini tidak lagi mengunci gulir vertikal atau mem-pin halaman.
  52. **Foto rapor tidak dipakai untuk OCR (17 Okt 2026, permintaan pemilik proyek):** hapus pemilih foto rapor dan OCR-nya dari Langkah 3. Nilai rapor tetap opsional dan diisi manual; OCR Akta dan KK tidak berubah.
  53. **Tes minat-bakat di landing (17 Okt 2026, permintaan pemilik proyek):** ganti simulasi skor rapor pada landing dengan 15 pertanyaan dari dokumen `TES MINAT DAN BAKAT CALON SISWA SMK 2027.docx`. Jawaban A/B/C/D dipetakan ke MPLB/AKL/LPK3/TKR; hasil dihitung lokal, nilai seri ditampilkan setara, tidak disimpan, dan tidak memengaruhi rekomendasi atau keputusan penerimaan di wizard.
  54. **Kolom nilai rapor muncul hanya bila pendaftar meminta saran jurusan (21 Okt 2026, permintaan pemilik proyek):** Langkah 3 membuka dengan dua pilihan: "Ya, saya isi nilai rapor" (untuk yang belum tahu jurusan yang cocok) dan "Tidak, saya akan memilih jurusan sendiri". Tabel nilai hanya tampil bila memilih "Ya"; bawaan "Tidak", kecuali draf sudah berisi nilai. Memilih "Tidak" mengirim nilai kosong (nilai yang sempat diketik tidak terkirim), sehingga perilaku server sama dengan keputusan 45. Pada Langkah 2, kartu hasil baca Akta/KK tampil dengan kolom kosong dan contoh isian bila dokumen gagal atau sebagian tidak terbaca, jenis kelamin berupa pilihan (L/P), dan lencana keyakinan HIGH berlabel "Terdeteksi"; pendaftar tetap harus memeriksa semua isian.
  55. **Tes minat-bakat pindah ke halaman sendiri, halaman sukses dirapikan, tautan admin dihapus dari footer (21 Okt 2026, permintaan pemilik proyek):** (a) tes 15 pertanyaan dari keputusan 53 kini di `/tes-minat-bakat` dan masuk lewat menu navbar "Tes Minat Bakat"; landing hanya berisi penjelasan dan tombol "Mulai tes minat bakat" (isi tes, perhitungan lokal, dan sifat tidak disimpan tidak berubah). (b) Halaman sukses memisahkan "Salin nomor" (di bawah nomor), kartu grup WhatsApp dengan langkah bergabung (tepat di bawah peringatan simpan nomor), dan bagian "Formulir pendaftaran" berisi Unduh formulir (PDF), Lihat dan cetak formulir, serta Cetak halaman ini, masing-masing dengan keterangan. (c) Tautan "Masuk panitia" dihapus dari footer; panitia masuk lewat alamat `/admin`, yang tanpa sesi dialihkan ke `/admin/login` oleh `proxy.ts`.
  56. **Gambar situs disimpan di Cloudinary (21 Okt 2026, permintaan pemilik proyek; mengubah 7.4 untuk bucket `konten-publik`):** unggahan gambar konten admin (berita, agenda, galeri, testimoni, foto jurusan, dan aset situs pada butir berikutnya) memakai Cloudinary, bukan bucket Supabase `konten-publik`. Gambar diperkecil (sisi terpanjang 1600 px) dan dikompres (`q_auto:good`) saat diunggah, lalu dikirim `f_auto,q_auto` (WebP/AVIF otomatis). Klien memakai REST bertanda tangan SHA-1 di `src/server/services/cloudinary.ts`, tanpa library `cloudinary`; hanya modul itu dan `media.ts` yang berbicara ke Cloudinary. Env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Urutan penyimpan di `simpanMedia`: Cloudinary, lalu Supabase (konten lama masih bisa dihapus), lalu disk lokal (hanya pengembangan); di produksi tanpa Cloudinary unggah ditolak. Paket gratis Cloudinary: 25 kredit per bulan (1 kredit = 1 GB simpanan, 1 GB bandwidth, atau 1.000 transformasi), cukup untuk sekitar 300 pendaftar. Gambar yang sudah di Supabase tidak dipindah otomatis.
  57. **Foto tetap situs dikelola admin dari halaman Galeri (21 Okt 2026, permintaan pemilik proyek; halamannya dipindah ke menu Foto Beranda oleh butir 61):** logo sekolah (navbar, layar pembuka, beranda, penutup), foto utama beranda (hero), foto tiap jurusan, dan lima foto kehidupan sekolah yang sebelumnya tertulis di kode kini bisa dilihat, diganti, dan dikembalikan ke bawaan dari bagian "Foto situs" di halaman admin Galeri (peran konten dan superadmin). Tanpa tabel baru: logo dan hero disimpan di `Pengaturan` (`aset_logo`, `aset_hero`), foto jurusan di `Jurusan.gambar` (kolom yang sebelumnya ada di panel Jurusan tetapi tidak dipakai situs), dan foto galeri bawaan dimuat ke tabel `Galeri` lewat tombol "Muat foto bawaan situs ke galeri" (hanya saat galeri kosong). Foto pilihan admin menimpa foto bawaan di `src/lib/aset-bawaan.ts`; foto pilihan admin memakai alt umum karena alt bawaan menjelaskan foto lama. Unggahan lewat `/api/v1/admin/media` (butir 56), file lama dibuang saat diganti, foto bawaan di `public/` tidak pernah dihapus. API: `GET /api/v1/admin/aset`, `PUT` dan `DELETE /api/v1/admin/aset/[kunci]`, `POST /api/v1/admin/aset/galeri-bawaan`; perubahan segera tampil lewat `revalidatePath`.
  58. **Pas foto di Cloudinary, akta dan KK hanya untuk OCR (21 Okt 2026, permintaan pemilik proyek; mengubah 7.3 dan 7.4):** (a) **Selesai:** pas foto pendaftar disimpan di Cloudinary dengan jenis pengiriman `authenticated` (tanpa URL publik; server membukanya lewat URL bertanda tangan) lewat `DriverCloudinary` (`src/server/services/penyimpanan/driverCloudinary.ts`). `penyimpananTemp()` mengarahkan penyimpanan berdasarkan rujukan: rujukan berawalan `cld:` ke Cloudinary, rujukan lama tetap ke penyimpanan sementara lama (Supabase `draf-temp` atau disk lokal), jadi pas foto lama masih terbaca. Pas foto berawalan `cld:` tidak dipindah ke Drive saat kirim dan tidak membuat status sinkron menggantung; penampil admin menandainya "Di Cloudinary". Tanpa kunci Cloudinary perilaku lama tidak berubah. Gambar disimpan maksimal 900x1200 px, `q_auto:good` (cukup untuk kotak 3x4 di PDF formulir). Diuji langsung ke akun Cloudinary: unggah, baca lewat URL bertanda tangan, URL tanpa tanda tangan ditolak (401), hapus. (b) **Keputusan, belum diterapkan di kode:** akta dan KK tidak lagi diunggah atau disimpan; foto hanya dibaca OCR di perangkat pendaftar lalu dibuang. Konsekuensi: panitia mencocokkan dengan dokumen fisik saat verifikasi (halaman sukses sudah meminta siswa membawa akta dan KK). Pekerjaan tersisa: langkah 2 wizard tidak memanggil `/draf/berkas` untuk akta/KK, server menolak unggahan akta/KK dari wizard, teks kebijakan privasi dan FAQ (yang masih menyebut unggah akta/KK dan baca rapor dari foto) diperbarui. Fitur panitia mengganti akta/KK secara manual dibiarkan sampai ada keputusan.
  59. **Gemini memakai gemini-3.5-flash-lite dan satu kali ulang saat 503 atau 429 (21 Okt 2026):** `gemini-2.5-flash` tidak lagi tersedia untuk akun baru. Model seri 3 yang lebih besar (`gemini-3.8-flash`, `gemini-3.5-flash`) berpikir lama (6 sampai 22 detik) dan sesekali 503, melebihi batas waktu 9 detik jendela obrolan, sedangkan `gemini-3.5-flash-lite` menjawab sekitar 1 detik secara konsisten. Bawaan kode dan `.env.example` kini `gemini-3.5-flash-lite`; `GEMINI_BATAS_HARIAN` disarankan 200 (di bawah batas gratis 250 per hari yang tertera di tabel resmi Google, angka ini perlu dicek di akun). Diuji pada alur asli: pertanyaan dalam FAQ dijawab dari FAQ, pertanyaan di luar FAQ dijawab Gemini tanpa mengarang ("tidak tahu, hubungi panitia") dan upaya injeksi ditolak.
  60. **Navigasi panel admin dibuat lebih jelas (21 Okt 2026, permintaan pemilik proyek):** menu samping memakai ikon dan satu baris penjelasan per item, grup diberi nama bermakna (Pendaftar, Aturan Pendaftaran, Isi Situs, Sistem), halaman aktif berlatar hijau solid, dan bilah atas menampilkan jejak lokasi, kartu nama dan peran, serta tombol Keluar yang tampil berbeda. Nama item tidak berubah; keterangan dibaca pembaca layar lewat `aria-describedby`. Logo panel mengikuti logo situs (butir 57).
  61. **Foto beranda dipisah dari Galeri (22 Okt 2026, permintaan pemilik proyek):** menu baru **Foto Beranda** (`/admin/foto-beranda`, grup Isi Situs, peran konten dan superadmin, ikon rumah) berisi foto tetap situs dari butir 57 (logo, foto utama beranda, foto tiap jurusan) dan Foto tambahan beranda (slideshow hero); foto tambahan slideshow kini tampil di dalam kartu Foto utama beranda (butir 64). Menu **Galeri** kini hanya galeri kegiatan ("Kehidupan sekolah") beserta tawaran memuat foto galeri bawaan (`features/admin/konten/muat-galeri-bawaan.tsx`, dipisah dari `panel-aset-situs.tsx`). API tidak berubah.
  62. **Pendaftar langsung diterima, verifikasi panitia dihapus (24 Okt 2026, permintaan pemilik proyek; menggantikan alur keputusan PRD v3.1 13.4 dan butir 31 bagian keputusan):** (a) submit wizard dan input manual selalu membuat pendaftar berstatus `approved`; bawaan kolom `statusVerifikasi` menjadi `approved` dan migrasi `20261024100000_pendaftar_langsung_diterima` mengubah semua pendaftar `pending` menjadi `approved` (yang sudah `revision` atau `rejected` dibiarkan sebagai data lama). Pilihan "Status awal" di input manual dihapus; panitia yang memasukkan data luring tetap dicatat di `diverifikasiOlehId`. (b) Menu Verifikasi, halaman `/admin/verifikasi` dan `/admin/verifikasi/[id]`, `POST /api/v1/admin/peserta/[id]/verifikasi`, aksi `putuskanVerifikasi`/antrean, dan skema keputusan dihapus; panitia tidak bisa lagi menolak, meminta revisi, atau membatalkan pendaftar. (c) Penampil berkas (akta, KK, pas foto; tiap pembukaan tetap diaudit), tombol sinkron Drive, dan panel nilai rapor ("Nilai sesuai" dan koreksi yang menghitung ulang saran jurusan) pindah ke halaman detail peserta. (d) **Kuota jurusan kini ditegakkan:** jurusan yang kuotanya penuh tampil "(kuota penuh)" dan tidak bisa dipilih di wizard, ditolak saat menyimpan langkah jurusan dan di dalam transaksi submit sesudah kunci advisory nomor dipegang (`services/kuota.ts` `pastikanKuotaTersedia`, galat 409 `KUOTA_PENUH`), sehingga dua kiriman bersamaan tidak melewati kuota. Jurusan terbuka lagi begitu admin menaikkan kuotanya di menu Kuota. Input manual luring tetap tidak diblokir kuota (keputusan panitia sebelumnya). (e) Cek Status menampilkan Diterima; panel perjalanan menjadi Formulir terkirim, Langsung diterima, Datang ke sekolah; teks halaman sukses, alur daftar, penutup, chatbot, dan langkah berkas tidak lagi menyebut verifikasi atau keputusan panitia. Dashboard hanya menghitung total, Diterima, dan nilai belum dicek; filter status menyisakan Diterima serta Perlu revisi/Ditolak untuk data lama. PDF formulir tidak berubah (mengikuti template).
  63. **Status pendaftaran tidak ditampilkan lagi di admin (24 Okt 2026, permintaan pemilik proyek, lanjutan butir 62):** karena semua pendaftar langsung diterima, kolom dan filter Status di Data Peserta dan Ekspor, kolom Status di daftar pendaftar terbaru dan kartu Diterima di dashboard, lencana status dan catatan panitia di detail peserta, kolom "Status Verifikasi" di XLSX, dan kolom Status di rekap PDF dihapus (lebarnya dibagi ke Nama dan Asal Sekolah). Detail peserta luring tetap menyebut panitia yang memasukkan datanya. Migrasi `20261024110000_semua_pendaftar_diterima` mengubah data lama `revision` dan `rejected` menjadi `approved` agar konsisten, termasuk perhitungan kuota. Halaman Cek Status untuk pendaftar tetap menampilkan Diterima. Parameter `status` di URL pencarian peserta masih diterima server tetapi tidak lagi ditawarkan di tampilan.
  64. **Foto tambahan beranda masuk ke kartu Foto utama beranda (24 Okt 2026, permintaan pemilik proyek):** admin mengira foto yang ditambahkan lewat tombol Tambah foto di kartu Foto utama beranda masuk ke kartu itu, padahal muncul di daftar terpisah di bawah. Kartu Foto utama beranda kini tampil paling depan selebar baris dan memuat "Foto berikutnya (n/6)": gambar kecil tiap foto tambahan sesuai urutan tampil, dengan tombol Ubah dan Hapus, serta petak Tambah foto selama belum 6 (`features/admin/konten/foto-tambahan-hero.tsx`). Daftar "Foto tambahan beranda" terpisah dihapus. `BATAS_FOTO_HERO` pindah ke `server/types/aset.ts` agar bisa dibaca klien. API tidak berubah.

### 1.4 Catatan serah terima: yang sudah dan belum dikerjakan (13 Oktober 2026)

**Sudah selesai (semua di cabang `main` lokal, belum di-push oleh pemilik proyek):** A0 sampai A4, A3 lengkap, PDF formulir (15.1), A6 lengkap, A5 OCR di browser (butir 39, belum teruji pada foto asli). Verifikasi terakhir: `npm run lint`, `npm run typecheck`, `npm test` (263 test), `npm run test:e2e` (87 test, perlu Postgres lokal `npm run db:start` dan dev server) semuanya hijau.

**Belum dikerjakan, urut yang disarankan:**
1. **Uji OCR pada foto dokumen asli (A5 sudah dikodekan, butir 39):** kumpulkan foto KK, akta, dan rapor asli (data disamarkan) dari beberapa HP, lalu ukur akurasi per field dan waktu baca. Ambang keyakinan, batas waktu 40 detik, dan ukuran gambar 1500 px (`src/lib/ocr/mesin.ts`) ditala dari hasilnya. Bila akurasi kurang, opsi berurutan: model `small` (±3 kali lebih lambat), perbaikan praproses, atau Google Vision hanya sebagai cadangan.
2. **Sisa A7**: cek kuota Drive dengan email peringatan ke superadmin dan ringkasan mingguan ke panitia (butuh pengaturan alamat email panitia), email status ke pendaftar (sengaja ditunda atas keputusan pemilik proyek). Ekspor XLSX, rekap PDF, email kode pendaftaran, dan cron harian sudah selesai (butir 35).
3. **Isi dan pemantauan chatbot**: panitia perlu melengkapi FAQ dan kata kuncinya (menu FAQ) dan mengisi `GEMINI_API_KEY`; pertimbangkan statistik pertanyaan yang jatuh ke AI atau tidak terjawab bila ingin dipantau (sengaja tidak disimpan sekarang demi privasi).
4. **Fase B (produksi)**: Supabase (bucket privat `draf-temp` dan publik `konten-publik`; kedua driver sudah ada, tinggal isi env dan uji unggah nyata), uji Google Drive nyata (butuh Client ID dan Secret OAuth), deploy Vercel (cek `outputFileTracingIncludes` untuk `template-dasar.pdf`), variabel lingkungan produksi, domain, HTTPS, `npm run build` produksi (belum pernah dijalankan sepanjang A4-A6, jalankan lebih dulu), Lighthouse.

**Hal yang perlu diwaspadai:** (a) tombol Kembali di wizard tidak menyimpan isian langkah yang sedang dibuka; (b) penyimpanan berkas sementara memakai disk lokal sampai Supabase diisi; (c) POST `/api/v1/draf` dan unggah wizard belum dibatasi laju per IP (tambahkan sebelum produksi); (d) belum ada header CSP; (e) tidak ada fitur hapus akun admin (hanya nonaktifkan, disengaja demi jejak audit); (f) setelah `prisma generate` atau migrasi, restart dev server; di Windows dengan memori terbatas dev server bisa mati sendiri, jalankan ulang `npm run dev`; (g) e2e memakai akun uji `e2e-*` dan data `Uji E2E*` yang dibersihkan `tests/e2e/global-teardown.ts`; (h) tampilan wizard dan admin sudah diperiksa di 360 px dan 1440 px lewat axe dan tes, tetapi belum ditinjau mata di HP asli.

---

## 2. Ringkasan Produk

*(Tidak berubah dari v3.1.)* Portal SPMB (Sistem Penerimaan Murid Baru) adalah situs pendaftaran daring SMK Ma'arif NU 1 Wangon, Banyumas, Jawa Tengah, berisi:

1. **Situs informasi sekolah**: profil, program keahlian, berita, agenda, galeri, testimoni alumni, FAQ.
2. **Wizard pendaftaran 8 langkah tanpa login**, mengikuti formulir kertas resmi. OCR membaca Akta, KK, dan rapor; nilai rapor dipakai untuk rekomendasi jurusan. Hasil akhir: nomor pendaftaran, halaman sukses bertoken, dan **PDF formulir yang harus identik dengan formulir kertas resmi** (Bagian 15.1).
3. **Panel admin panitia**: dashboard, verifikasi berkas dan nilai, data pendaftar, kuota, konten, form builder, pengaturan, ekspor.

Identitas sekolah dan program keahlian sama seperti v3.1 (lihat Lampiran 23.1).

---

## 3. Tujuan & KPI

Sama seperti v3.1, dengan tambahan:

| # | Tujuan | KPI |
|---|---|---|
| 1-9 | *(lihat v3.1, tidak berubah: kecepatan wizard, akurasi OCR, rekomendasi bisa dijelaskan, performa, dll.)* | |
| 10 | **PDF formulir identik dengan template** | Perbandingan visual piksel-per-piksel (overlay) antara PDF hasil sistem dan `docs/template-formulir.*` menunjukkan 0 pergeseran elemen tetap (kop, garis, label) |
| 11 | **Biaya operasional minimal** | Total biaya bulanan di luar musim pendaftaran: Rp 0. Saat musim pendaftaran ramai: < Rp 50.000/bulan (OCR berjalan di HP pendaftar, tanpa biaya; biaya hanya dari hosting dan layanan lain) |

---

## 4. Ruang Lingkup

### 4.1 Masuk lingkup

Sama seperti v3.1 Bagian 4.1, dengan catatan: metode sistem cerdas **hanya OCR** (tanpa chatbot AI, tanpa SPK/ML), sesuai v3.1.

### 4.2 Di luar lingkup v4

Sama seperti v3.1 Bagian 4.2 (tanpa login siswa, tanpa pembayaran daring, tanpa integrasi Dapodik, dst), ditambah:

- **OCR di server atau layanan OCR berbayar.** OCR berjalan di browser pendaftar dengan PaddleOCR (Bagian 11, butir 39). Server OCR dan Google Vision tidak dipakai.
- **VPS/Docker di produksi.** Deploy hanya lewat Vercel.

---

## 5. Aktor & Hak Akses

Sama seperti v3.1 Bagian 5. Mekanisme autentikasi berubah (Bagian 7.5 dan 17), tapi peran (superadmin/panitia/konten) dan cakupan aksesnya tidak berubah.

---

## 6. Arsitektur, Tech Stack & Struktur Folder

### 6.1 Keputusan: satu aplikasi Next.js, backend lewat Route Handlers

**Kenapa Laravel dibuang:** Laravel adalah server PHP yang harus menyala terus-menerus (PHP-FPM). Tidak ada cara menjalankannya gratis secara andal (lihat diskusi hosting gratis sebelumnya — Render free tier tidur saat idle, Oracle Always Free sering kehabisan slot dan bisa ditarik kembali kalau idle). Vercel, sebaliknya, menjalankan Next.js sebagai fungsi serverless yang hanya aktif saat ada request, dan paket gratisnya genuinely cukup untuk trafik sekolah ini.

**Konsekuensi yang perlu disadari:** permintaan awal proyek ini ("frontend dan backend dipisah foldernya") tadinya berarti dua aplikasi terpisah yang bisa di-deploy sendiri-sendiri. Dengan satu aplikasi Next.js, itu tidak lagi berlaku secara infrastruktur — hanya ada satu proses yang di-deploy. **Pemisahan tetap dijaga secara logis** lewat struktur folder (6.4): kode tampilan (`src/app`) tidak pernah mengimpor langsung dari kode database/service (`src/server`) kecuali lewat route handler atau server action yang jelas batasnya. Ini trade-off yang disadari, bukan diabaikan diam-diam.

**Alternatif yang dipertimbangkan dan ditolak:**

| Opsi | Kenapa ditolak |
|---|---|
| Laravel + VPS berbayar murah | Bukan "hampir gratis" sesuai permintaan terbaru. Tetap jadi opsi cadangan bila Vercel/Supabase ternyata tidak cukup saat produksi (lihat 22, D5) |
| Next.js frontend + Laravel di Render/Railway free | Render free tidur saat idle (bikin OCR & wizard lambat/timeout), Railway sudah tidak gratis |
| Full Supabase (pakai Edge Functions sebagai backend, bukan Next.js API) | Edge Functions (Deno) punya ekosistem library lebih kecil dari Node, dan tim lebih familiar dengan Next.js penuh. Next.js Route Handlers dipilih karena satu bahasa (TypeScript) dari ujung ke ujung |

### 6.2 Diagram arsitektur

```
                           Browser (HP / Laptop)
                                    │ HTTPS
                                    ▼
                    ┌───────────────────────────────┐
                    │   Vercel (Next.js, satu app)   │
                    │                                 │
                    │  src/app/(publik)   → halaman   │
                    │  src/app/(daftar)   → wizard     │
                    │  src/app/(admin)    → panel admin│
                    │  src/app/api/v1/*   → Route      │
                    │                       Handlers   │
                    │  src/server/*       → db, service,│
                    │                       validasi    │
                    └───┬──────────┬──────────┬────────┘
                        │          │          │
            Prisma/pgSSL│   Drive  │  Resend API
                        │   API    │
            ┌───────────▼┐ ┌───────▼─┐
            │  Supabase   │ │ Google  │      (OCR berjalan di browser
            │  Postgres   │ │ Drive   │       pendaftar, bukan di sini)
            │  (RLS ON)   │ │(dokumen)│
            └─────────────┘ └─────────┘
                        │
            ┌───────────▼───────┐
            │ Supabase Storage   │
            │ konten-publik      │
            │ draf-temp (privat) │
            └────────────────────┘

Vercel Cron (1x/hari) → route /api/v1/cron/* → bersih draf kedaluwarsa,
                          retry upload Drive gagal, ringkasan email
```

Prinsip:

- **Satu origin.** Tampilan dan API berada di domain yang sama, jadi cookie sesi admin tetap first-party, tanpa CORS.
- **`src/server` adalah satu-satunya yang bicara ke Prisma dan Drive API.** Komponen UI tidak pernah memanggil layanan eksternal langsung.
- **Dokumen siswa tidak pernah punya URL publik** — sama seperti v3.1, hanya klien Node yang berbeda.
- **Validasi otoritatif selalu di server** (dalam route handler), meski skema Zod yang sama dipakai juga di client untuk UX instan.

### 6.3 Tech stack

| Lapisan | Teknologi | Catatan |
|---|---|---|
| Framework | Next.js 16 (App Router), React, TypeScript | Sudah berjalan dari M1 lama |
| Hosting | Vercel (Hobby di awal, upgrade ke Pro kalau trafik/berbayar jadi relevan) | `maxDuration` route OCR/submit diset hingga 60-180 dtk (Hobby mengizinkan hingga 300 dtk dengan fluid compute) |
| Database | Supabase PostgreSQL | Lokal (Docker) di Fase A, Supabase asli di Fase B |
| ORM | **Prisma** | `DATABASE_URL` lewat Supabase connection pooler (transaction mode) untuk query, `directUrl` khusus migrasi |
| Validasi | **Zod**, satu skema dipakai di client (React Hook Form) dan server (route handler) | Hilangkan duplikasi aturan |
| Styling | Tailwind CSS v4 | Sudah ada dari M1 |
| Komponen dasar | Radix UI primitives | Sudah ada dari M1 |
| Animasi UI | Motion (`motion/react`) | Sudah ada dari M1 |
| Animasi landing | GSAP + ScrollTrigger | Sudah ada dari M1 |
| Auth admin | Sesi custom: JWT (`jose`) di cookie httpOnly, hash password `bcryptjs` | Lebih ringan dari NextAuth untuk kasus login-sederhana 3 peran |
| OCR | **PaddleOCR PP-OCRv6 tiny** (`ppu-paddle-ocr` + `onnxruntime-web`, WASM) di Web Worker browser | Bagian 11 |
| Storage dokumen pendaftar | **Google Drive API** (`googleapis`), OAuth | Bagian 7.3 |
| Storage sementara wizard & konten publik | **Supabase Storage** (`@supabase/supabase-js`) | Bagian 7.4 |
| Email | **Resend** (`resend` npm) | Bagian 15.4 |
| PDF | **`pdf-lib`** menimpa teks di atas PDF template terkunci | Bagian 15.1 |
| Barcode | **`bwip-js`** (Code 39, murni Node, tanpa dependensi native) | |
| Excel | **`exceljs`** | |
| Tugas terjadwal | **Vercel Cron** (`vercel.json`) | Bagian 20.3 |
| Grafik admin | Recharts | |
| Ikon | Phosphor Icons (`@phosphor-icons/react`) | Sudah ada dari M1 |
| Testing | Vitest + Testing Library (unit/komponen), Playwright (E2E) | Backend dan frontend satu runner karena satu bahasa |
| Kualitas | ESLint, Prettier, TypeScript strict mode | |

### 6.4 Struktur folder (satu aplikasi)

```
spmb-v4/
├── CLAUDE.md                       # Aturan umum agen AI, rujuk docs/PRD.md
├── README.md
├── docs/
│   ├── PRD.md                      # Dokumen ini
│   ├── template-formulir.docx      # [BLOKIR] menunggu dari pemilik proyek
│   ├── template-formulir.md        # [BLOKIR] menunggu dari pemilik proyek
│   ├── adr/                        # 0001-arsitektur-nextjs.md, dst
│   ├── api/openapi.yaml
│   └── design/                     # tangkapan layar & catatan M1 (sudah ada)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   └── fonts/, images/
├── vercel.json                     # cron, maxDuration per route
├── src/
│   ├── app/                        # SEMUA tampilan + route API (Next.js App Router)
│   │   ├── (publik)/               # page.tsx (landing), jurusan/[kode], berita, cek-status
│   │   ├── (daftar)/daftar/        # langkah/[n], sukses/[token]
│   │   ├── (admin)/admin/          # login, dashboard, peserta, verifikasi, konten, ...
│   │   └── api/v1/
│   │       ├── landing/, jurusan/, berita/, faq/, form-schema/, mapel/
│   │       ├── draf/               # route.ts, langkah/[n], berkas/[jenis], ocr (catat ringkasan), rekomendasi, submit
│   │       ├── sukses/[token]/, formulir/[token]/, cek-status/
│   │       ├── admin/              # login, logout, me, dashboard, pendaftar, dokumen, kuota, ...
│   │       └── cron/               # bersih-draf, retry-drive, ringkasan-email (dipanggil Vercel Cron)
│   │
│   ├── server/                     # SEMUA logic backend. UI TIDAK BOLEH impor dari sini kecuali lewat api/
│   │   ├── db/                     # client.ts (Prisma singleton)
│   │   ├── auth/                   # sesi.ts (buat/verifikasi JWT), middleware peran
│   │   ├── actions/                # Satu file = satu use case: buatDraf.ts, submitPendaftaran.ts, ...
│   │   ├── services/
│   │   │   ├── ocr.ts              # catat OcrHasil dan muat alias mapel (mesin dan parser OCR ada di browser: src/lib/ocr/)
│   │   │   ├── rekomendasi/        # hitungSkor.ts
│   │   │   ├── penyimpanan/        # interface PenyimpananDokumen + driverDrive.ts + driverSupabaseTemp.ts
│   │   │   ├── nomor/              # generatorNomorPendaftaran.ts
│   │   │   ├── formSchema/
│   │   │   ├── pdf/                # generateFormulirPdf.ts, barcode.ts
│   │   │   ├── xlsx/
│   │   │   └── email/              # client Resend + template
│   │   ├── validasi/                # skema Zod, satu per langkah wizard & entitas admin
│   │   └── types/
│   │
│   ├── components/
│   │   ├── ui/                     # Button, Input, Select, FileDrop, Badge, Card, Dialog, Stepper, ... (sudah ada M1)
│   │   ├── layout/                 # Navbar, Footer, AdminShell (sudah ada M1)
│   │   └── motion/                 # Reveal, StaggerList, PageTransition, useGsap hooks (sudah ada M1)
│   ├── features/                   # Kode per fitur sisi klien: components/, hooks/, schema-client.ts
│   │   ├── landing/, wizard/, ocr/, rekomendasi/, cek-status/, faq/
│   │   └── admin/{dashboard,pendaftar,verifikasi,konten,form-builder,pengaturan}/
│   ├── lib/                        # api-client.ts (fetch wrapper), format.ts, image-compress.ts
│   └── styles/                     # globals.css (@theme token Tailwind v4, sudah ada M1)
├── tests/
│   ├── unit/                       # src/server/* (Vitest)
│   ├── component/                  # src/components, src/features (Testing Library)
│   └── e2e/                        # Playwright
└── _archive/                       # Kerja lama, TIDAK dipakai, disimpan untuk referensi (Bagian 24)
    ├── backend-laravel/
    └── ocr-service-python/
```

Aturan perawatan:

- **`src/server` tidak pernah mengimpor dari `src/app` atau `src/components`.** Arahnya satu jalur: UI → route handler (`src/app/api`) → `src/server`.
- **Satu skema Zod per entitas**, disimpan di `src/server/validasi/`, diimpor baik oleh route handler (validasi otoritatif) maupun oleh form client (`src/features/*/schema-client.ts` cukup re-export skema server bila tidak perlu beda).
- **Service di `src/server/services/` tidak boleh tahu soal HTTP.** Mereka menerima dan mengembalikan objek biasa; route handler yang menerjemahkan ke `Request`/`Response`.
- Kontrak API tetap didokumentasikan di `docs/api/openapi.yaml` agar gampang diaudit, meski sekarang klien dan server satu bahasa.

---

## 7. Database, Storage & Layanan Eksternal

### 7.1 Fase A vs Fase B — penting

PRD ini sengaja memisahkan **apa yang dipakai saat membangun fitur (Fase A)** dari **apa yang dipakai saat produksi (Fase B)**, sesuai arahan pemilik proyek. Baca ini dulu sebelum bagian lain di bawah supaya tidak bingung kredensial mana yang dibutuhkan kapan.

| Layanan | Fase A (bangun fitur) | Fase B (go-live) |
|---|---|---|
| Database | **Postgres lokal** via Docker (compose dev yang sudah ditulis sebelumnya masih dipakai, tinggal arahkan `DATABASE_URL` ke situ) | Supabase Postgres (project asli sekolah) |
| Storage dokumen pendaftar | Google Drive — **boleh pakai akun Google pribadi developer**, folder uji coba terpisah dari folder final | Google Drive akun final (lihat 22, D4) |
| Storage sementara & konten publik | Supabase Storage — **bisa pakai project Supabase gratis milik developer sendiri** untuk uji coba, atau langsung project final bila sudah dibuat | Project Supabase final |
| OCR | Tidak butuh kredensial: berjalan di browser pendaftar (butir 39) | Tidak ada yang perlu dipindahkan |
| Email | Resend — API key bisa langsung dipakai dari awal (tidak ada perbedaan dev/prod yang berarti) | Sama, domain pengirim diverifikasi saat go-live |
| Hosting | `next dev` di laptop | Vercel (deploy pertama kali di Fase B) |

Intinya: **semua fitur di Fase A dites dengan kredensial "murah/pribadi" seadanya**, supaya tidak menunggu akun resmi sekolah selesai dibuat. Begitu tim sudah melihat dan menyetujui tampilan serta fitur, Fase B tinggal mengganti nilai env ke akun final — kode tidak berubah karena semua akses layanan eksternal sudah di belakang `src/server/services/*`.

### 7.2 Supabase — database

Setup project (dilakukan di **Fase B**, lihat 7.1):

1. Buat project Supabase, region Southeast Asia (Singapore).
2. Ambil **connection string pooler** (transaction mode, port 6543) untuk `DATABASE_URL`, dan **session pooler** (port 5432) atau direct connection untuk `DIRECT_URL` (dipakai Prisma migrate).
3. `DB_SSLMODE=require`.

```env
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@<POOLER_HOST>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@<POOLER_HOST>:5432/postgres"
```

```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

RLS tetap diaktifkan di semua tabel (migrasi terakhir, sama seperti v3.1 Bagian 7.4), karena Prisma mengakses lewat role `postgres` (bypass RLS secara sah) sementara akses langsung dari browser (via Supabase client untuk Storage) tetap dibatasi RLS.

**Catatan "tidur" Supabase Free:** project free di-pause otomatis setelah 7 hari tanpa aktivitas. Mitigasi: cron harian (Bagian 20.3) yang sudah jalan tiap hari otomatis menghitung sebagai aktivitas, jadi project tidak akan sempat idle 7 hari selama cron jalan.

### 7.3 Google Drive — dokumen pendaftar

Sama seperti v3.1 Bagian 7.5, dengan penyesuaian klien:

- Library: `googleapis` (Node), bukan `google/apiclient` (PHP).
- Alur OAuth: route handler `src/app/api/v1/admin/google-drive/hubungkan` dan `.../callback`, refresh token disimpan terenkripsi (`src/server/services/penyimpanan/kripto.ts`, pakai `AES-256-GCM` dengan kunci dari env) di tabel `pengaturan`.
- Scope tetap `drive.file`. Status aplikasi OAuth wajib **"In production"** sebelum go-live (Fase B) — selama Fase A boleh "Testing" karena token di-refresh manual oleh developer.
- Struktur folder, aturan privasi, kuota, retry, dan ketentuan lain: **tidak berubah dari v3.1 Bagian 7.5.1-7.5.3.**

### 7.4 Supabase Storage — sementara wizard & konten publik

Perubahan penting dari v3.1: **tidak ada lagi "disk lokal privat VPS"** untuk berkas wizard, karena di Vercel serverless tidak ada disk yang persisten antar request. Sebagai gantinya:

| Bucket | Akses | Isi | Catatan |
|---|---|---|---|
| `draf-temp` | Private | `{draf_id}/{jenis}-{acak}.{ext}` — berkas yang diunggah selama wizard, sebelum submit | Dihapus oleh cron harian setelah draf kedaluwarsa atau setelah berhasil dipindah ke Drive |
| `konten-publik` | Public | Hero, galeri, foto kepala sekolah, berita, agenda, testimoni, foto jurusan | Sama seperti v3.1 |

Alur berkas (menggantikan v3.1 Bagian 7.5.1):

```
Wizard (sebelum submit)
  unggah → Supabase Storage bucket draf-temp: {draf_id}/{jenis}-{acak}.{ext}
         → OCR membaca foto yang sama langsung di browser (tidak lewat URL dan tidak meninggalkan HP)
Submit berhasil (dalam satu route handler, synchronous — Vercel Hobby mengizinkan hingga 300 dtk)
  → ambil semua berkas draf-temp
  → unggah ke Google Drive: SPMB/{periode}/{nomor} - {NAMA}/
  → simpan file ID Drive ke tabel pendaftar
  → hapus berkas dari draf-temp
  → bila upload Drive gagal: catat berkas_sinkron = 'gagal', JANGAN hapus dari draf-temp,
    cron harian retry-drive akan mengulang
```

Karena Vercel Hobby kini mengizinkan durasi fungsi hingga 300 detik (bukan 10 detik seperti dulu), proses unggah ke Drive bisa dilakukan **langsung di dalam request submit**, tanpa perlu antrean/job terpisah — jauh lebih sederhana dari rancangan queue di v3.1.

### 7.5 Autentikasi admin

Menggantikan Laravel Sanctum:

- Login: `POST /api/v1/admin/login` memverifikasi `bcryptjs.compare`, lalu menerbitkan JWT (`jose`, algoritma `HS256`) berisi `{sub: userId, peran}`, masa berlaku 8 jam, disimpan di cookie `spmb_admin` (httpOnly, Secure, SameSite=Lax).
- Setiap route `api/v1/admin/*` diverifikasi lewat `src/server/auth/verifikasiSesi.ts` yang dipanggil di awal handler (atau lewat `middleware.ts` Next.js untuk proteksi halaman `(admin)/admin/*` di sisi tampilan).
- Peran dicek per endpoint (mis. endpoint konten menerima `konten`+`superadmin`, endpoint pengaturan hanya `superadmin`).
- Draf wizard: token acak 40 karakter di cookie `spmb_draft` (httpOnly), hash SHA-256 disimpan di kolom `tokenHash` tabel `PendaftaranDraft` — **mekanismenya sama persis seperti v3.1**, hanya bukan lagi berbasis session Laravel.

---

## 8. Skema Database (Prisma)

Isinya sama persis secara konsep dengan v3.1 Bagian 8 (tabel, kolom, relasi, index semuanya dipertahankan), hanya dituliskan ulang sebagai `schema.prisma` memakai penamaan `camelCase` (konvensi Prisma/TypeScript) alih-alih `snake_case` Laravel. Ringkasan model (lihat v3.1 Bagian 8.1-8.9 untuk detail tiap kolom beserta aturan validasinya — semua itu tetap berlaku):

```prisma
model User {
  id                 BigInt   @id @default(autoincrement())
  name               String
  username           String   @unique
  email              String?  @unique
  passwordHash       String
  peran              Peran
  isActive           Boolean  @default(true)
  mustChangePassword Boolean  @default(true) // tidak dipakai lagi sejak keputusan 37; dibiarkan agar tanpa migrasi
  lastLoginAt        DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
enum Peran { superadmin panitia konten }

model Jurusan {
  id           BigInt   @id @default(autoincrement())
  kode         String   @unique
  nama         String
  deskripsi    String?
  prospekKarir Json?
  keunggulan   Json?
  kuota        Int      @default(72)
  gambar       String?
  urutan       Int      @default(0)
  isActive     Boolean  @default(true)
  bobot        BobotJurusan[]
  pendaftarPilihan1 Pendaftar[] @relation("pilihan1")
  pendaftarPilihan2 Pendaftar[] @relation("pilihan2")
  pendaftarRekomendasi Pendaftar[] @relation("rekomendasi")
}

model MataPelajaran {
  id       BigInt   @id @default(autoincrement())
  kode     String   @unique
  nama     String
  alias    Json     // array string untuk pencocokan OCR
  kelompok String   // umum | madrasah | mulok
  isActive Boolean  @default(true)
  urutan   Int
  bobot    BobotJurusan[]
}

model BobotJurusan {
  id              BigInt @id @default(autoincrement())
  jurusanId       BigInt
  mataPelajaranId BigInt
  bobot           Decimal @db.Decimal(4,3)
  jurusan         Jurusan       @relation(fields: [jurusanId], references: [id], onDelete: Cascade)
  mataPelajaran   MataPelajaran @relation(fields: [mataPelajaranId], references: [id], onDelete: Cascade)
  @@unique([jurusanId, mataPelajaranId])
}

model PendaftaranDraft {
  id              String   @id @default(uuid())
  tokenHash       String   @unique
  data            Json     // terenkripsi di level aplikasi sebelum disimpan (lihat 17)
  langkahTerakhir Int      @default(1)
  berkas          Json     // {akta, kk, rapor: [...], kustom_*} path di bucket draf-temp
  ip              String?
  userAgent       String?
  expiresAt       DateTime
  submittedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Pendaftar {
  id                   BigInt   @id @default(autoincrement())
  nomorPendaftaran     String   @unique
  aksesTokenHash       String   @unique
  periode              String
  sumber               Sumber   @default(daring)
  statusVerifikasi     StatusVerifikasi @default(pending)
  statusNilai          StatusNilai @default(belumDicek)
  catatanVerifikasi    String?
  catatanPenolakan     String?
  diverifikasiOlehId   BigInt?
  diverifikasiAt       DateTime?
  notifikasiEmailAt    DateTime?

  // Bagian A-D: identik dengan v3.1 Lampiran 23.6 (nama, NIK terenkripsi, dst — lihat lampiran)
  // ...

  nilaiRapor           Json     // {semester:[...], mapel:{kode:{semester:nilai,...,rata}}}
  nilaiRaporSumber      String   // ocr | ocr_dikoreksi | manual
  nilaiRaporKoreksi     Json?
  rekomendasiJurusanId  BigInt?
  rekomendasiSkor       Json
  rekomendasiVersi      String
  jurusan1Id            BigInt?
  jurusan2Id            BigInt?

  aktaFileId            String?
  kkFileId              String?
  raporFileIds          Json?
  kustomFileIds         Json?
  driveFolderId         String?
  berkasMeta            Json?
  berkasSinkron         BerkasSinkron @default(menunggu)
  dataKustom            Json?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  jurusan1       Jurusan? @relation("pilihan1", fields: [jurusan1Id], references: [id])
  jurusan2       Jurusan? @relation("pilihan2", fields: [jurusan2Id], references: [id])
  rekomendasi    Jurusan? @relation("rekomendasi", fields: [rekomendasiJurusanId], references: [id])
  ocrHasil       OcrHasil[]
}
enum Sumber { daring luring }
enum StatusVerifikasi { pending approved rejected revision }
enum StatusNilai { belumDicek sesuai dikoreksi }
enum BerkasSinkron { menunggu selesai gagal }

model OcrHasil {
  id           BigInt   @id @default(autoincrement())
  draftId      String?
  pendaftarId  BigInt?
  jenis        String   // akta | kk | rapor
  provider     String   @default("google_vision")
  fields       Json
  confidence   Json
  durasiMs     Int
  sukses       Boolean
  createdAt    DateTime @default(now())
  pendaftar    Pendaftar? @relation(fields: [pendaftarId], references: [id])
}

// Faq, Berita, Event, Galeri, Testimoni, Pengaturan, FormField, AuditLog:
// identik secara konsep dengan v3.1 Bagian 8.8, ditulis ulang sebagai model Prisma.
```

Catatan migrasi dari rancangan v3.1: kolom data sensitif (NIK, no KK, no HP) **tidak lagi memakai cast `encrypted` ala Laravel**, melainkan dienkripsi secara eksplisit di `src/server/services/kripto.ts` sebelum `prisma.create`/`update`, dan didekripsi saat dibaca untuk tampilan admin. Ini sama levelnya, hanya eksplisit karena Prisma tidak punya fitur cast-terenkripsi bawaan.

---

## 9. Kontrak API (Route Handlers)

Bentuk endpoint **tidak berubah** dari v3.1 Bagian 9 — path, method, dan perilaku tiap endpoint tetap sama persis, supaya dokumentasi lama tetap relevan. Yang berubah hanya implementasinya (Route Handler Next.js, bukan Controller Laravel).

Format respons tetap sama:

```json
{ "message": "Data tidak valid.", "errors": { "nik": ["NIK harus 16 digit."] }, "code": "VALIDATION_ERROR" }
```

**Rujuk v3.1 Bagian 9.1 dan 9.2 untuk daftar lengkap endpoint publik dan admin** — semua tetap berlaku, dengan dua perubahan path:

- `/admin/pengaturan/uji-drive` tetap ada.
- Tambahan: `/api/v1/cron/bersih-draf`, `/api/v1/cron/retry-drive`, `/api/v1/cron/ringkasan` — dipanggil Vercel Cron (dilindungi header rahasia `CRON_SECRET`, bukan oleh admin biasa).

Setiap Route Handler mengikuti pola:

```ts
// src/app/api/v1/draf/langkah/[n]/route.ts
export async function PUT(req: Request, { params }: { params: { n: string } }) {
  const sesi = await ambilDraf(req);              // dari src/server
  const body = await req.json();
  const data = skemaLangkah(Number(params.n)).parse(body); // Zod, lempar error → 422 otomatis
  const hasil = await simpanLangkah(sesi, Number(params.n), data); // src/server/actions
  return Response.json(hasil);
}
```

---

## 10. Fitur Publik & Wizard Pendaftaran

**Tidak berubah secara fungsional dari v3.1 Bagian 10** (layout publik, landing, detail jurusan, 8 langkah wizard, mekanisme draf, Tanya Sunan, cek status). Penyesuaian teknis saja:

- Landing dirender lewat **Next.js App Router** (Server Components + `revalidate`), bukan Next.js terpisah yang fetch ke Laravel — jadi malah lebih cepat (tidak ada lagi network hop antara frontend dan backend, keduanya satu proses).
- Revalidasi konten saat admin menyimpan: pakai `revalidatePath()`/`revalidateTag()` Next.js bawaan, bukan webhook `FRONTEND_REVALIDATE_URL` seperti v3.1.
- Submit wizard (10.5 di v3.1): urutan transaksi tetap sama, hanya langkah "pindahkan berkas ke Drive" kini **synchronous di dalam request yang sama** (lihat 7.4), bukan job queue terpisah.
- Semua aturan field, validasi, dan urutan langkah **identik** dengan v3.1 Bagian 10.2-10.9 dan Lampiran 23.3/23.6.

---

## 11. OCR: PaddleOCR di browser pendaftar

### 11.1 Kenapa di browser, bukan Vision API atau server

Pembacaan dokumen berjalan **di HP pendaftar**, bukan di server (butir 39). Alasannya: gratis tanpa kuota (Vision API hanya gratis 1.000 unit per bulan), tidak butuh server Python yang menyala terus, dan foto Kartu Keluarga yang memuat NIK seluruh keluarga tidak dikirim ke pihak ketiga. Konsekuensinya diterima: akurasi dan kecepatan bergantung pada HP dan kualitas foto, sehingga OCR diperlakukan sebagai **bantuan isian, bukan sumber kebenaran**. Hasil selalu bisa diedit, dan bila gagal pendaftar mengisi manual.

### 11.2 Arsitektur

```
Pendaftar memilih foto (kamera atau galeri)
  → kompresGambar (src/lib/gambar.ts): sisi panjang 1600 px, JPEG 0,85, urutan EXIF diterapkan
  → unggah ke /api/v1/draf/berkas (hanya akta dan KK)   dan   OCR keduanya di browser:
       src/lib/ocr/mesin.ts   antarmuka bacaDokumen(), satu pembacaan pada satu waktu, batas 40 dtk
       src/lib/ocr/worker.ts  Web Worker: decode, perkecil ke 1500 px, luruskan (deskew.ts, proyeksi piksel),
                              PaddleOCR PP-OCRv6 tiny (onnxruntime-web, WASM) → BarisOcr[] { teks, kotak, skor }
        src/lib/ocr/parser/{akta,kk}.ts   teks + kotak → fields + keyakinan (HIGH, MEDIUM, LOW, NOT_FOUND)
      → UI: kartu hasil OCR yang bisa diedit di Langkah 2; nilai rapor dimasukkan manual di Langkah 3
  → POST /api/v1/draf/ocr: ringkasan pembacaan (jenis, sukses, durasi, keyakinan per field, TANPA nilai) → OcrHasil
  → PUT /api/v1/draf/langkah/2 { ocr: {...} }: saran isian disaring ulang server, disimpan di data langkah 2,
    lalu mengisi langkah 5 dan 6 (diberi tanda "Dari dokumen" selama belum diubah)
  → PUT /api/v1/draf/langkah/3 { nilai_rapor, sumber_nilai: "manual" }
```

Parser hanya mengenal `BarisOcr`, bukan mesinnya, sehingga mesin bisa diganti tanpa menyentuh parser dan UI:

```ts
type BarisOcr = { teks: string; kotak: [number, number, number, number]; skor: number };
type FieldOcr = { nilai: string; keyakinan: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_FOUND' };
parseAkta(baris: BarisOcr[], namaTarget?: string); // tempat lahir, jenis kelamin, nama ayah dan ibu
parseKk(baris: BarisOcr[], namaTarget: string);    // no KK, NIK siswa, alamat, RT, RW, desa, kecamatan, kabupaten, provinsi
```

**Aset:** `public/ocr/model` (deteksi 1,9 MB, pengenalan 4,5 MB, kamus 27 KB; PP-OCRv6 tiny, lisensi Apache-2.0, di-commit) dan `public/ocr/ort` (runtime WASM onnxruntime-web, ±14 MB, disalin dari `node_modules` oleh `scripts/salin-wasm-ocr.mjs` pada `postinstall`, tidak di-commit). Keduanya disajikan dari domain sendiri dengan `Cache-Control: public, max-age=604800`, jadi tiap perangkat mengunduh sekali. Berkas hanya dimuat lewat `import()` dinamis di halaman Langkah 2. `turbopack.resolveAlias` memetakan `onnxruntime-web` ke `onnxruntime-web/wasm` (build WebGPU bawaan butuh berkas 28 MB).

### 11.3 Aturan bisnis (v3.1 Bagian 11.3 tetap berlaku)

- Nama dan tempat/tanggal lahir hanya dari Akta. NIK siswa dari anggota KK yang namanya paling mirip nama di Langkah 1 (Levenshtein, tahan kata menempel dan urutan kata berbeda); bila tidak ada yang mirip (< 0,7), tidak diisi dan pendaftar diberi peringatan. Nama Akta atau tanggal lahir Akta yang berbeda dengan Langkah 1 memunculkan peringatan.
- **Tidak menebak:** hanya HIGH dan MEDIUM yang mengisi field (MEDIUM bertanda "Perlu dicek"); LOW dan NOT_FOUND dibiarkan kosong. Deret NIK atau nomor KK yang bukan 16 digit tidak diperbaiki dengan menebak; karakter yang jelas tertukar (O dengan 0, l dengan 1, B dengan 8, dst.) diperbaiki dan diturunkan ke MEDIUM.
- Karakter di luar huruf Latin dan angka (misalnya huruf Tionghoa dari stempel) dibuang sebelum diparse.
- Nama ayah dan ibu dari KK hanya cadangan bila Akta tidak terbaca (anggota yang lahir minimal 15 tahun sebelum siswa), selalu MEDIUM.

### 11.4 Rapor

Nilai rapor diisi manual pada tabel Langkah 3; pendaftar boleh mengisi sebagian atau mengosongkannya seluruhnya. Rata-rata dihitung otomatis, dan rekomendasi jurusan tetap dibuat bila ada nilai yang tersedia. `sumber_nilai` untuk pendaftaran baru selalu `manual`; nilai historis `ocr` atau `ocr_dikoreksi` tetap dipertahankan.

### 11.5 Ketentuan umum dan kapan dianggap gagal

- **Batas waktu baca 40 detik** (`BATAS_WAKTU_MS`). Lewat batas, pekerja dihentikan dan pendaftar diarahkan mengisi manual.
- Dianggap gagal (pesan ramah, mengarah ke isi manual, tidak pernah menghalangi pendaftaran): PDF (tidak dibaca otomatis), perangkat tanpa Web Worker, `OffscreenCanvas`, atau WebAssembly, foto yang tidak bisa didekode, kesalahan mesin, waktu habis, atau tidak ada satu pun field yang terisi.
- Hasil dari browser **tidak dipercaya server**: saran isian disaring ulang (`bersihkanIsianOcr`, nilai tak valid dibuang diam-diam), field langkah 5 dan 6 divalidasi ulang oleh skema form, dan panitia tetap mencocokkan dengan berkas asli saat verifikasi.
- `OcrHasil` hanya menyimpan ringkasan (jenis, sukses, durasi, keyakinan dan terisi tidaknya tiap field, sebab gagal), **tanpa nilai hasil bacaan** karena memuat data pribadi. `provider` = `paddleocr`. Catatan dibatasi 60 per draf per jam.

### 11.6 Keterbatasan yang diketahui

- Akurasi pada foto dokumen **asli** baru diuji pada satu foto KK dan gambar sintetis. Hasil uji: pada foto KK asli nomor KK dan tiga dari empat NIK benar; huruf kadang keliru (misalnya `197B` untuk 1978, kata menempel). Karena itu semua hasil wajib diperiksa pendaftar.
- Kecepatan: sekitar 12 detik untuk foto KK 2000 px di HP Android 10 (8 inti, 4 GB); ukuran gambar baca kini 1500 px. Pemuatan pertama mengunduh ±6,4 MB model dan ±14 MB WASM.
- Foto sangat miring (di atas ±8 derajat), buram, atau bergambar kecil (di bawah ±800 px) sering gagal. Deskew hanya untuk kemiringan kecil.
- Nilai rapor dengan tata letak tidak lazim (nama mapel terpotong dua baris, beberapa semester dalam satu tabel) tidak selalu terbaca.

---

## 12. Rekomendasi Jurusan dari Nilai Rapor

**Tidak berubah sama sekali dari v3.1 Bagian 12** — rumus pembobotan rata-rata tertimbang, label relatif (Paling Sesuai/Juga Sesuai/Alternatif/Data Kurang), bobot default per jurusan, dan kriteria terima semuanya tetap. Ini murni logic, tidak bergantung arsitektur.

---

## 13. Panel Admin

**Tidak berubah secara fungsional dari v3.1 Bagian 13** (dashboard, data peserta, verifikasi, detail & edit, kuota, input manual, konten, jurusan & bobot, pengaturan, statistik OCR). Penyesuaian teknis:

- 13.4 Verifikasi: penampil dokumen sekarang melalui route handler yang mengambil file dari Google Drive API (Node) — perilakunya sama seperti v3.1.
- 13.10 Pengaturan: tombol "Hubungkan Google Drive" memakai alur OAuth Next.js (7.3).
- 13.11 Statistik OCR: `provider` di `OcrHasil` selalu `paddleocr` (OCR berjalan di HP pendaftar, tanpa kuota atau biaya). Halaman menampilkan jumlah pembacaan, tingkat berhasil, dan kecepatan (median, p95) per jenis dokumen.

---

## 14. Form Builder Dinamis

**Tidak berubah dari v3.1 Bagian 14** secara fungsional. `GET /api/v1/form-schema` tetap ada, field bawaan terkunci, field kustom bisa ditambah lewat admin. Skema Zod untuk validasi kustom dibangun dinamis di `src/server/validasi/formKustom.ts` dari konfigurasi field, menggantikan `FormFieldConfig::aturanKustom()` Laravel.

---

## 15. Dokumen Keluaran

### 15.1 PDF formulir — **[SELESAI]** (template diterima 7 Okt 2026, diimplementasikan 11 Okt 2026)

Ini perubahan paling penting di v4. PRD v3.1 meminta PDF yang "meniru" formulir kertas. **Permintaan baru: PDF yang dihasilkan sistem harus sama persis (100%) — desain, tata letak, dan isi — dengan template resmi** yang akan Anda taruh di:

- `docs/template-formulir.docx`
- `docs/template-formulir.md`

**Sampai kedua file itu ada di repo, bagian ini terkunci.** Claude Code (atau agen mana pun) tidak boleh menebak-nebak desain formulir; kerjakan bagian PRD lain dulu (Bagian 10-14, 16) sambil menunggu.

**Metode yang dipakai begitu template tersedia** (dipilih khusus supaya hasilnya bisa dijamin identik, bukan "mirip"):

1. **Buat PDF dasar sekali** dari template (`template-formulir.docx` dikonversi ke PDF statis — kop surat, garis, label, semua elemen tetap — lewat LibreOffice/skrip konversi, dicek manual sekali agar persis). PDF dasar ini disimpan di `src/server/services/pdf/template-dasar.pdf` dan **tidak pernah diubah oleh kode**.
2. **`pdf-lib` menimpa teks dinamis** (nama, NISN, nilai, alamat, dst — posisinya dipetakan satu per satu ke koordinat `x,y` di atas PDF dasar itu) dan menempelkan gambar barcode (`bwip-js`, Code 39) serta kotak foto.
3. Karena lapisan tetap (kop, garis, label) berasal dari PDF dasar yang sama persis dengan template, bukan digambar ulang oleh kode, hasilnya **dijamin identik** pada bagian yang tidak berubah — satu-satunya pekerjaan teknis adalah memetakan koordinat tiap field dinamis dengan tepat.

**Yang perlu disiapkan begitu template tiba:**

- Pemetaan tiap field dinamis (semua kolom Bagian A-D, nilai ujian, nomor pendaftaran, barcode, kotak foto) ke koordinat `x,y` dan ukuran font di atas PDF dasar — dikerjakan sambil membandingkan render hasil dengan template asli, halaman demi halaman, sampai posisinya pas.
- Dua lembar "Tanda Terima Berkas" di template (bila ada) dipetakan dengan cara yang sama.
- Hasil akhir diverifikasi dengan overlay visual (PDF hasil ditumpuk transparan di atas scan/export PDF template asli) untuk memastikan 0 pergeseran.

**Setelah template tiba, update bagian ini** dengan daftar field-ke-koordinat yang sudah dipetakan, supaya PRD tetap jadi acuan tunggal.

**Implementasi (11 Okt 2026).** `src/server/services/pdf/template-dasar.pdf` = `docs/template-formulir.docx` diekspor lewat Microsoft Word (COM, `ExportAsFixedFormat`), 3 halaman 612,12 x 936,12 pt: hal 1-2 formulir, hal 3 dua lembar Tanda Terima. Tidak pernah diubah kode. Penimpa isian: `src/server/services/pdf/formulir.ts`; peta koordinat lengkap (id slot, halaman, x, garis dasar y, lebar maks) di `peta-formulir.ts`, diukur langsung dari PDF dasar (char origin + bentuk vektor). Sumbu Y ke bawah dari tepi atas. Ringkasan pemetaan:

| Halaman | Isi |
|---|---|
| 1 | No. Pendaftaran (kotak atas), A.1-A.15 di atas garis titik-titik, kotak jenis kelamin (X), dua kotak penghasilan (digit kode 01-05), kotak jurusan (angka 1 = pilihan pertama, 2 = pilihan kedua) |
| 2 | B (SMP, ijazah, lama belajar, nilai ujian + terbilang), C (golongan darah, tinggi/berat, penyakit), D (hobi), kotak seragam (X), "Wangon, {tanggal kirim}", nama di tanda tangan murid, Referensi Pendaftar |
| 3 | Dua lembar Tanda Terima: nomor/jurusan (kode), nama, asal sekolah, RT/RW/desa, kecamatan, kabupaten, "Wangon, {tanggal}", "Harap datang tanggal" dari pengaturan `tanggal_verifikasi` |

Keputusan: (a) tahun pelajaran 2026/2027 di template ditutup kotak putih dan digambar ulang dengan Times New Roman tebal ukuran sama dari `periode`; (b) isian HURUF BESAR (petunjuk formulir), email tetap huruf kecil, teks mengecil otomatis (min 6,5 pt) lalu terpotong bila tidak muat; (c) tanpa barcode dan tanpa `bwip-js`: template tidak memilikinya dan permintaan "sama persis" menang atas 15.1 lama; (d) nomor pendaftaran di Tanda Terima 8 pt karena kolomnya hanya 56 pt; (e) kolom Petugas, Tanda Tangan, kotak berkas, dan Pas photo dibiarkan kosong untuk panitia; (f) alamat jalan murid dan orang tua tidak punya kolom di template, jadi tidak dicetak; (g) font standar Times (WinAnsi), karakter di luar itu diganti `?` tanpa aksen. Akses: `GET /api/v1/pendaftar/{token}/formulir` (token akses halaman sukses; `?unduh=1` memaksa unduh; tanpa cache); admin memakai `formulirDariNomor` di A6. Verifikasi: render PDF hasil ke PNG (mupdf, di luar repo) dan dibandingkan dengan render template; test CI memeriksa halaman, ukuran, jejak koordinat tiap slot, dan isi content stream. Build produksi memakai `outputFileTracingIncludes` di `next.config.ts` agar template ikut terbawa ke Vercel (belum diuji di Vercel).

### 15.2 Ekspor XLSX

Sama seperti v3.1 Bagian 15.2, dibuat dengan `exceljs` menggantikan `maatwebsite/excel`. Isi kolom dan format (header hijau, nilai rapor rata-rata, dst) tidak berubah.

### 15.3 Rekap PDF

Sama seperti v3.1 Bagian 15.3, dibuat dengan `pdf-lib` langsung (bukan menimpa template, karena ini laporan internal, bukan dokumen resmi — tidak terikat 15.1).

### 15.4 Email kode pendaftaran

Sama seperti v3.1 Bagian 15.4 secara isi, dikirim lewat **Resend** (`resend.emails.send(...)`) menggantikan SMTP+queue Laravel. Karena tidak ada queue, pengiriman dilakukan langsung di akhir route handler submit (dibungkus try/catch — kegagalan kirim email tidak menggagalkan pendaftaran, dicoba ulang oleh cron harian bila gagal).

---

## 16. Arahan Desain & Motion

**Tidak berubah dari v3.1 Bagian 16 — dan sudah selesai dikerjakan di M1.** Token warna (hijau NU, kertas hangat, emas kunyit), tipografi (Bricolage Grotesque + Plus Jakarta Sans), komposisi halaman, daftar larangan anti AI slop, pembagian peran Motion vs GSAP, dan aturan UX wajib semuanya tetap berlaku persis seperti sebelumnya. Tidak perlu dikerjakan ulang — lanjutkan dari komponen dan token yang sudah ada.

---

## 17. Keamanan & Privasi

Sama seperti v3.1 Bagian 17, dengan penyesuaian mekanisme:

| Aspek | v4 |
|---|---|
| Auth admin | JWT di cookie httpOnly (7.5), bukan Sanctum. Password `bcryptjs`, throttle login via tabel percobaan login sederhana (karena tidak ada middleware throttle Laravel bawaan — implementasi manual: hitung percobaan gagal per username per 15 menit) |
| Siswa tanpa login | Sama persis: token draf dan token akses hash SHA-256 di cookie httpOnly |
| Dokumen | Google Drive privat, dilihat lewat route admin yang mencatat audit — sama seperti v3.1 |
| Data sensitif | NIK, no KK, no HP dienkripsi eksplisit (`src/server/services/kripto.ts`, AES-256-GCM) sebelum disimpan Prisma |
| CSRF | Karena auth berbasis cookie httpOnly + fetch dari origin yang sama, proteksi CSRF memakai pengecekan header `Origin`/`Sec-Fetch-Site` di route handler admin yang mengubah data (POST/PUT/DELETE) |
| XSS | React escaping default; HTML berita disanitasi server-side (`isomorphic-dompurify` atau `sanitize-html`) sebelum disimpan |
| Rate limit | Karena tidak ada middleware throttle bawaan, dipakai Upstash Redis (free tier) atau penghitungan sederhana di tabel untuk endpoint publik sensitif (submit, OCR, cek status, login) |
| Header keamanan | Diset lewat `next.config.ts` (`headers()`): HSTS, CSP, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` |
| Audit | Sama seperti v3.1: login, verifikasi, edit, koreksi nilai, lihat dokumen, ekspor, ubah pengaturan/bobot |

---

## 18. Bug v1 & Temuan Audit

Semua temuan dari v3.1 Bagian 18 (bug v1 dan audit PRD v2) **tetap berlaku dan tetap wajib diperbaiki** — tidak diulang di sini, rujuk v3.1 untuk daftar lengkapnya. Temuan baru khusus transisi ke v4:

| # | Temuan | Dampak | Perbaikan |
|---|---|---|---|
| B1 | Disk lokal untuk berkas sementara wizard (asumsi v3.1) tidak berfungsi di Vercel serverless (tidak persisten antar request) | Berkas wizard hilang di tengah jalan | Dipindah ke Supabase Storage bucket `draf-temp` (Bagian 7.4) |
| B2 | Queue/job Laravel (`php artisan queue:work`) tidak ada padanannya di serverless | Upload Drive & email tidak bisa "di-queue" seperti rencana lama | Dilakukan synchronous di dalam request (Hobby kini mengizinkan hingga 300 dtk), kegagalan ditangani oleh cron harian, bukan queue real-time |
| B3 | Rate limiting dan throttle login bergantung middleware bawaan Laravel | Tidak ada middleware setara di Next.js | Diimplementasikan manual atau pakai Upstash Redis (17) |
| B4 | PDF formulir sebelumnya "meniru", sekarang wajib identik | Pendekatan generate-dari-nol tidak menjamin kecocokan piksel | Pakai PDF template terkunci + `pdf-lib` menimpa teks (15.1) |

---

## 19. Strategi Testing

**Backend/service (`src/server/*`) — Vitest**

- Semua aturan dari v3.1 Bagian 19 tetap berlaku (keamanan endpoint admin, draf, nomor pendaftaran, rekomendasi, form builder), ditulis sebagai test Vitest yang memanggil fungsi `src/server/actions/*` langsung (tanpa perlu server HTTP berjalan) ditambah beberapa test route handler dengan `next/server` testing utilities.
- Mock Prisma dengan database test terpisah (Postgres lokal via Docker — sama seperti dipakai Fase A), bukan mock total, supaya constraint & transaksi ikut teruji.
- Mock Google Drive API dan Resend dengan `vi.mock` / MSW (Mock Service Worker) agar test tidak memanggil layanan asli dan tidak kena biaya.

**Komponen (Testing Library)** — sama seperti v3.1 Bagian 19: form error, tabel nilai, reduced motion.

**E2E (Playwright)** — sama seperti v3.1: alur daftar lengkap (OCR dipalsukan lewat `window.__SPMB_OCR_PALSU__`, ditambah satu uji dengan mesin PaddleOCR sungguhan pada foto KK sintetis `tests/fixtures/kk-sintetis.jpg`), alur admin, audit aksesibilitas otomatis.

**PDF (khusus, baru)** — setelah 15.1 tidak lagi [BLOKIR]: test otomatis yang merender PDF dengan data contoh, lalu membandingkan posisi teks hasil terhadap koordinat yang dipetakan (bukan perbandingan gambar piksel di CI, karena rapuh — verifikasi visual piksel dilakukan manual sekali saat pemetaan awal, test CI memverifikasi field terisi di koordinat yang benar).

---

## 20. Roadmap Dua Fase

Sesuai arahan: **semua tampilan dan fitur selesai dulu (Fase A, pakai layanan lokal/murah), baru penyiapan layanan produksi (Fase B)**, supaya tim bisa melihat dan mencoba sebelum akun-akun resmi sekolah disiapkan.

### 20.1 Fase A — Fungsional Lengkap (lokal)

| # | Milestone | Isi | Selesai bila |
|---|---|---|---|
| A0 | **Fondasi v4** (transisi arsitektur) | Arsip kerja Laravel lama (Bagian 24), struktur folder baru (6.4), Prisma + Postgres lokal, auth admin dasar, `src/server/services/penyimpanan` dengan driver Google Drive (akun dev) + Supabase Storage dev, CI satu-proyek | `next dev` jalan, login admin bisa, 1 file uji berhasil diunggah-dilihat-dihapus dari Drive, test Vitest dasar hijau |
| A1 | Design system | **Sudah selesai**, lanjutkan dari M1 lama (6.4 sudah dipindah) | — (tidak perlu dikerjakan ulang) |
| A2 | Data & auth | Semua model Prisma (Bagian 8), migrasi ke Postgres lokal, seeder (jurusan, mapel, bobot, FAQ, form field, superadmin), proteksi route admin + peran, `openapi.yaml` awal | Test akses admin hijau, data seed tampil di katalog admin |
| A3 | Konten & landing | CRUD konten & jurusan, pengaturan, landing + GSAP, detail jurusan, berita | Test aktif/nonaktif & empty state, Lighthouse ≥ target (lokal) |
| A4 | Wizard tanpa OCR | Draf (di Postgres lokal + Supabase Storage dev), langkah 1-8 isian manual, form schema dinamis, tabel nilai manual, rekomendasi, submit, nomor, halaman sukses, cek status | E2E alur manual hijau |
| A5 | OCR terintegrasi | PaddleOCR di browser (Bagian 11, butir 39), parser akta/kk/rapor (11.2-11.4), UI Langkah 2-3, fallback saat gagal | Fallback manual berfungsi (selesai); akurasi diuji dengan foto asli (belum, lihat 1.4) |
| A6 | Panel admin operasional | Dashboard, data peserta, verifikasi + koreksi nilai, detail, edit, kuota, input manual, editor bobot + pratinjau, statistik OCR | Test verifikasi & koreksi tercatat audit |
| A7 | Dokumen keluaran | XLSX, rekap PDF, email (Resend) — **PDF formulir (15.1) dikerjakan terpisah begitu template tiba, tidak memblokir sisanya** | Ekspor & email teruji; placeholder PDF formulir dipakai sementara jika template belum ada |
| A8 | Tanya Sunan | Widget FAQ + pencarian Jaccard | Test pencarian & throttle |

**Keluaran Fase A:** aplikasi berjalan penuh di `localhost`, memakai Postgres lokal + akun dev Google Drive/Supabase — **bisa ditunjukkan dan dicoba tim** (`npm run dev`, atau di-deploy preview Vercel dengan env dev agar tim bisa coba dari browser tanpa setup lokal masing-masing — ini opsi bagus karena preview deployment Vercel juga gratis).

### 20.2 Fase B — Go-Live (produksi)

| # | Milestone | Isi | Selesai bila |
|---|---|---|---|
| B0 | Migrasi Supabase produksi | Buat project Supabase resmi, jalankan migrasi Prisma ke sana, pindahkan seed data final, aktifkan RLS | Aplikasi jalan dengan `DATABASE_URL` produksi, data konsisten |
| B1 | Google Drive produksi | Hubungkan akun Google final (lihat 22 D4), OAuth app ke status "In production", folder Drive produksi dibuat bersih | Uji unggah-lihat-hapus dengan akun final berhasil |
| B2 | Deploy Vercel & domain | Deploy ke Vercel, sambungkan domain `spmb.smkmanu1wangon.sch.id`, isi semua env produksi, verifikasi domain pengirim Resend, pasang Vercel Cron (20.3) | Situs bisa diakses dari domain asli, email terkirim dari domain resmi |
| B3 | Hardening & serah terima | Audit aksesibilitas (`design:accessibility-review`) dan desain (`design:design-critique`), uji keamanan (checklist 17 & 18), PDF formulir final diverifikasi 100% identik dengan template, dokumentasi operator untuk panitia, UAT bersama panitia | Semua checklist lolos, panitia bisa mengoperasikan tanpa developer |

### 20.3 Jadwal (Vercel Cron, maksimal 1x/hari di paket gratis)

| Jadwal | Tugas |
|---|---|
| Harian 02:00 | Hapus draf kedaluwarsa (`expiresAt` lewat) beserta berkas `draf-temp` terkait |
| Harian 02:15 | Retry berkas `berkasSinkron = gagal` ke Google Drive |
| Harian 06:00 | Cek kuota Google Drive, kirim email peringatan ke superadmin bila mendekati batas |
| Mingguan (dipicu dari cron harian, cek hari Senin) | Ringkasan pendaftar ke email panitia (opsional, sesuai pengaturan) |

```json
// vercel.json
{
  "crons": [
    { "path": "/api/v1/cron/bersih-draf", "schedule": "0 2 * * *" },
    { "path": "/api/v1/cron/retry-drive", "schedule": "15 2 * * *" },
    { "path": "/api/v1/cron/cek-kuota", "schedule": "0 6 * * *" }
  ]
}
```

---

## 21. Deployment (Vercel)

### 21.1 Fase A — preview

Selama Fase A, tim bisa mencoba lewat **Vercel Preview Deployment**: setiap push ke branch kerja otomatis dapat URL preview gratis (`spmb-v4-git-<branch>.vercel.app`), memakai env Fase A (database/Drive/Supabase dev). Tidak perlu domain atau akun produksi untuk ini.

### 21.2 Fase B — produksi

1. Hubungkan repo GitHub ke project Vercel (sekali, lewat dashboard Vercel).
2. Isi **Environment Variables** di dashboard Vercel (bukan file `.env` yang di-commit): `DATABASE_URL`, `DIRECT_URL`, `GOOGLE_DRIVE_*`, `GOOGLE_CLOUD_VISION_*`, `RESEND_API_KEY`, `JWT_SECRET`, `CRON_SECRET`, `ENCRYPTION_KEY`, dst.
3. Push ke branch `main` → Vercel otomatis build & deploy ke produksi.
4. Tambahkan domain `spmb.smkmanu1wangon.sch.id` di pengaturan domain Vercel, ikuti instruksi DNS (CNAME/A record) yang diberikan Vercel ke pengelola DNS sekolah.
5. Jalankan `prisma migrate deploy` terhadap database produksi (sekali, lewat GitHub Action atau manual).
6. Verifikasi domain pengirim di Resend (tambah record DNS yang diminta) supaya email tidak masuk spam.

**Tidak ada lagi VPS, Docker Compose produksi, atau Nginx untuk dikelola** — ini penyederhanaan besar dibanding v3.1 Bagian 21.

### 21.3 Perintah setup awal (Fase A)

```bash
mkdir spmb-v4 && cd spmb-v4 && git init
npx create-next-app@latest . --ts --tailwind --app --src-dir --eslint
npm install prisma @prisma/client zod react-hook-form @hookform/resolvers \
  motion gsap @gsap/react @radix-ui/react-dialog @radix-ui/react-select \
  @tanstack/react-query @phosphor-icons/react jose bcryptjs \
  googleapis @supabase/supabase-js @google-cloud/vision resend pdf-lib bwip-js exceljs recharts
npm install -D vitest @testing-library/react @playwright/test prisma

npx prisma init
# arahkan DATABASE_URL ke Postgres lokal (docker compose dev yang sudah ada)
npx prisma migrate dev --name init
```

---

## 22. Keputusan & Pertanyaan Terbuka

**Untuk tim pengembang**

| # | Keputusan | Default sementara |
|---|---|---|
| D1 | Enkripsi NIK/HP vs kemudahan pencarian | Enkripsi + hash pencarian (sama seperti v3.1) |
| D2 | Library grafik admin | Recharts |
| D3 | Rate limiting: Upstash Redis vs tabel manual | Mulai dari tabel manual (lebih sederhana, tanpa akun tambahan), pindah ke Upstash bila perlu lebih presisi |
| D5 | **Cadangan bila Vercel Hobby/Supabase Free ternyata tidak cukup saat trafik tinggi** | Upgrade bertahap: Vercel Pro ($20/bln) dulu (paling murah & langsung), baru Supabase Pro bila 500 MB kelewat |
| D6 | **Tingkatkan OCR bila akurasi PaddleOCR di browser kurang pada foto asli** | Uji dulu dengan foto asli (1.4), lalu urutan: praproses, model `small`, atau Google Vision/Document AI hanya sebagai cadangan |
| D7 | **Cara pendaftar menerima kode pendaftaran: email (Resend atau Brevo) atau WhatsApp** (belum diputuskan pemilik proyek, 13 Okt 2026) | Opsi dan catatan di bawah tabel ini. Sampai diputuskan, kode tetap tampil di halaman sukses dan di PDF formulir, dan email lewat Resend tetap berjalan bila pendaftar mengisinya |

**Catatan D7: opsi pengiriman kode pendaftaran (dicatat 13 Okt 2026, belum dikerjakan).**

- **Email lewat Resend (sekarang):** kuota gratis ±100 email per hari dan 3.000 per bulan. Cukup bila hanya sebagian pendaftar mengisi email (isian email bersifat opsional). Tidak cukup bila sekitar 200 pendaftar per hari semuanya mengisi email.
- **Email lewat Brevo:** kuota gratis ±300 email per hari menurut artikel perbandingan (angka harus dicek ulang di halaman harga Brevo sebelum dipakai). Cukup untuk ±200 per hari. Kiriman di atas kuota gagal (tidak ditunda), tetapi aplikasi sudah mengulang email tertunda lewat cron harian. Pindah dari Resend cukup memakai REST API lewat `fetch` (tanpa library baru), tetapi mengganti penyedia email termasuk perubahan arsitektur sehingga PRD diperbarui dulu dan persetujuan pemilik proyek diminta.
- **WhatsApp otomatis lewat API resmi Meta (lewat penyedia seperti Qontak):** pesan pertama dari sekolah berbayar per pesan (tarif untuk Indonesia belum terverifikasi) dan butuh akun bisnis terverifikasi serta template yang disetujui Meta.
- **WhatsApp otomatis lewat gateway tidak resmi (misalnya Fonnte, tersambung lewat QR):** murah, tetapi melanggar aturan WhatsApp sehingga nomor sekolah berisiko diblokir, dan kode pendaftaran (yang membuka status dan PDF pendaftar) lewat pihak ketiga tidak resmi. Tidak disarankan.
- **Fitur "Simpan kode ke WhatsApp" (disetujui sebagai calon fitur, belum dikerjakan):** tombol di halaman sukses yang membuka WhatsApp pendaftar dengan pesan yang sudah terisi (nomor pendaftaran, kode akses, tautan cek status) lewat tautan `https://wa.me/?text=...`. Pendaftar menekan kirim sendiri ke nomornya sendiri atau orang tuanya. Gratis, tanpa API, tanpa pihak ketiga, dan tanpa risiko blokir; kekurangannya tidak otomatis. Dapat dipakai bersama email sebagai cadangan. Kodenya kecil: satu tombol di `src/app/(daftar)/daftar/sukses/[token]/page.tsx` ditambah satu test e2e.
- **Keputusan yang ditunggu:** pemilik proyek memilih antara email (tetap Resend atau pindah Brevo), WhatsApp, atau gabungan. Setelah itu PRD Bagian 10.7 dan 14 diperbarui bersama kodenya.

**Untuk pemilik proyek / pihak sekolah**

Sama seperti v3.1 Bagian 22 (S1-S14: format nomor, semester rapor, dst — tidak berubah; nama jurusan kefarmasian diperbarui oleh keputusan 44), ditambah:

| # | Pertanyaan | Dampak |
|---|---|---|
| S15 | *(dari v3.1)* Siapa pemegang akun Google Drive penyimpanan dokumen setelah proyek selesai | Kelanjutan akses data |
| S16 | **Kapan `docs/template-formulir.docx` dan `.md` bisa diberikan?** | Memblokir Bagian 15.1 — bagian lain tetap bisa jalan tanpa ini |
| S17 | Boleh pakai akun Google Cloud pribadi developer untuk Drive selama Fase A, atau sekolah ingin segera menyiapkan akun resmi dari awal? | Menentukan kapan Fase B bisa mulai |

---

## 23. Lampiran

Lampiran berikut **tidak berubah dari v3.1** — rujuk dokumen itu untuk isi lengkapnya, karena semuanya murni data/aturan bisnis yang tidak bergantung arsitektur:

- **23.1** Seed jurusan (deskripsi, prospek karier, keunggulan per AKL/MPLB/LPK3/TKR)
- **23.2** Seed mata pelajaran (SMP/MTs Kurikulum Merdeka + K13, termasuk alias dan aturan PAI vs mapel madrasah)
- **23.3** Seed field formulir bawaan per langkah wizard
- **23.4** Daftar berkas fisik (tanda terima)
- **23.5** Opsi dropdown & daftar stopword pencarian FAQ
- **23.6** Kolom lengkap Bagian A-D tabel pendaftar beserta aturan validasi

### 23.7 Template `.env` (v4)

```env
# App
NEXT_PUBLIC_SITE_URL=https://spmb.smkmanu1wangon.sch.id
APP_LOCALE=id
APP_TIMEZONE=Asia/Jakarta

# Database (Fase A: Postgres lokal Docker; Fase B: Supabase)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/spmb_dev"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/spmb_dev"

# Auth
JWT_SECRET=
ENCRYPTION_KEY=                     # 32 byte, untuk AES-256-GCM data sensitif
ADMIN_SEED_USERNAME=superadmin
ADMIN_SEED_PASSWORD=

# Google Drive (dokumen pendaftar)
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/v1/admin/google-drive/callback
GOOGLE_DRIVE_ROOT_FOLDER_NAME=SPMB
# refresh token disimpan di DB (tabel Pengaturan), bukan di env

# Supabase Storage (konten publik + draf-temp)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET_PUBLIC=konten-publik
SUPABASE_BUCKET_DRAFT=draf-temp

# Email
RESEND_API_KEY=
RESEND_FROM="SPMB SMK Ma'arif NU 1 Wangon <spmb@smkmanu1wangon.sch.id>"

# Cron
CRON_SECRET=                        # header rahasia, dicek di setiap /api/v1/cron/*

WA_GROUP_URL=
```

### 23.8 Status migrasi kode dari arsitektur lama

| Berkas/kerja lama (Laravel) | Status di v4 |
|---|---|
| `PenyimpananDokumen.php` (driver lokal & Google Drive) | Diarsipkan ke `_archive/backend-laravel/`. Logic/alurnya dipakai sebagai acuan menulis `src/server/services/penyimpanan/` versi TypeScript (Bagian 24) |
| OAuth Google Drive (PHP) | Sama — acuan alur, ditulis ulang pakai `googleapis` |
| Tabel `pengaturans` + migrasi | Acuan skema, ditulis ulang sebagai model Prisma `Pengaturan` |
| Command `spmb:drive-*` | Ditulis ulang sebagai fungsi di `src/server/services/penyimpanan/`, dipanggil dari route cron, bukan command Artisan |
| `ocr-service/` (FastAPI kosong) | Diarsipkan, tidak dilanjutkan — OCR pindah ke browser pendaftar (Bagian 11) |
| Docker Compose dev | **Bagian Postgres-nya tetap dipakai** untuk database lokal Fase A. Bagian Nginx/prod diarsipkan (tidak relevan untuk Vercel) |
| CI GitHub Actions (3 proyek) | Ditulis ulang untuk satu proyek Next.js |
| Design system M1 (token, komponen `ui/*`, motion, katalog) | **Dipakai penuh**, dipindah ke struktur folder baru tanpa diubah isinya |

---

## 24. Instruksi Transisi untuk Claude Code

Bagian ini ditulis khusus untuk agen coding (Claude Code atau lainnya) yang melanjutkan proyek ini setelah revisi v4. Baca ini SEBELUM menyentuh kode bila repo masih berisi struktur lama (`backend/`, `ocr-service/`, `frontend/`).

### 24.1 Urutan kerja transisi

1. **Jangan hapus kerja lama.** Pindahkan `backend/` dan `ocr-service/` ke `_archive/backend-laravel/` dan `_archive/ocr-service-python/` (git mv, supaya histori tetap ada). Ini referensi, bukan kode aktif.
2. **Pindahkan isi `frontend/` ke root sebagai aplikasi utama.** Sesuaikan ke struktur folder baru di Bagian 6.4 — pisahkan `src/app/` (tampilan + route API) dari `src/server/` (logic backend baru, ditulis dari nol mengikuti Bagian 6-19 PRD ini).
3. **Jangan tulis ulang design system (M1).** Token, komponen `ui/*`, wrapper motion, dan katalog `/admin/_katalog` yang sudah ada di `frontend/` sudah selesai dan benar — pindahkan apa adanya ke struktur baru, cukup sesuaikan path import bila perlu.
4. Update `CLAUDE.md` di root sesuai Bagian 1 dan 6 PRD ini (hapus referensi ke `backend/CLAUDE.md` dan `ocr-service/CLAUDE.md` yang sudah tidak ada; satu `CLAUDE.md` di root sudah cukup untuk satu aplikasi).
5. Setup Prisma + Postgres lokal (pakai service Postgres dari `docker-compose.dev.yml` lama yang masih relevan — jalankan hanya service database-nya, abaikan service lain di file itu).
6. Mulai Milestone **A0** (Bagian 20.1), lalu lanjut A2 sampai A8 berurutan. **A1 sudah selesai (M1 lama), lewati.**
7. Komit tiap milestone selesai. Dua komit lama yang belum ter-push (`6ebd5ed`, `115f16b`) boleh di-push apa adanya sebagai bagian dari histori sebelum arsip — tidak perlu di-squash atau dihapus.

### 24.2 Yang harus ditanyakan ke pemilik proyek sebelum lanjut, bukan ditebak

- Kredensial OAuth Google (Client ID/Secret) untuk Drive — bisa pakai akun pribadi developer untuk Fase A (lihat 7.1), tapi tetap perlu dibuatkan sendiri lewat Google Cloud Console (langkah ada di v3.1 Bagian 7.5.2, path OAuth-nya tinggal disesuaikan ke endpoint Next.js).
- `docs/template-formulir.docx` dan `.md` — **Bagian 15.1 terkunci sampai ini ada.** Jangan membangun layout PDF formulir berdasarkan tebakan atau berdasarkan rancangan lama di v3.1 Bagian 15.1 (yang sudah tidak berlaku).

### 24.3 Konteks penting lain

Pemilik proyek mungkin berpindah sesi atau berpindah ke agen AI lain di tengah jalan (bila kuota Claude Code habis). Karena itu:

- **Jangan simpan keputusan penting hanya di percakapan** — semua keputusan arsitektur harus tercermin di `docs/PRD.md` ini. Kalau ada keputusan baru yang dibuat bersama pemilik proyek di luar PRD, update PRD-nya dulu di commit yang sama.
- Tulis pesan commit yang jelas (apa yang dikerjakan, milestone mana) supaya agen lain yang melanjutkan — siapa pun itu — bisa paham konteks hanya dari `git log` dan PRD ini, tanpa riwayat percakapan.
