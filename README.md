# SPMB SMK Ma'arif NU 1 Wangon

Portal penerimaan murid baru: situs sekolah, wizard pendaftaran 8 langkah tanpa login, dan panel admin panitia.
Satu aplikasi Next.js (Vercel, Prisma, Postgres). Sumber kebenaran: [`docs/PRD.md`](docs/PRD.md).

## Menjalankan secara lokal (Fase A)

Prasyarat: Node 22, dan Postgres 14 atau lebih baru (Docker tidak wajib).

```bash
npm install                  # juga menjalankan prisma generate
cp .env.example .env         # lalu isi JWT_SECRET (min. 32 karakter), ENCRYPTION_KEY (64 hex), ADMIN_SEED_PASSWORD
npm run db:start             # Postgres lokal tanpa Docker di port 5433 (lihat scripts/db-lokal.mjs)
npm run db:migrate           # terapkan migrasi
npm run db:seed              # buat akun superadmin dari ADMIN_SEED_*
npm run dev                  # http://localhost:3000
```

Bangkitkan rahasia:

```bash
node -e "const c=require('crypto');console.log('JWT_SECRET='+c.randomBytes(48).toString('base64url'));console.log('ENCRYPTION_KEY='+c.randomBytes(32).toString('hex'))"
```

Halaman penting: `/` (beranda), `/admin/login`, `/admin/_katalog` (katalog komponen, hanya lokal).

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm test` | Vitest (butuh Postgres lokal menyala, memakai database `spmb_test`) |
| `npm run test:e2e` | Playwright (axe, tangkapan layar katalog ke `docs/design/`) |
| `npm run db:start` / `db:stop` / `db:status` | Kelola Postgres lokal |
| `npm run db:migrate` / `db:seed` | Prisma migrate dev / seed |

## Struktur

`src/app` (tampilan dan route API), `src/server` (semua logic backend), `src/components`, `src/features`,
`prisma/`, `tests/`, `docs/`. Kerja lama (Laravel, OCR Python, Docker) ada di `_archive/` hanya sebagai acuan.
Aturan lapisan dan cara kerja agen AI: [`CLAUDE.md`](CLAUDE.md).

## Layanan eksternal

Google Drive, Google Vision, Supabase Storage, dan Resend dipasang bertahap; kredensialnya diisi di `.env`
(lihat `.env.example`). Tanpa kredensial, fitur terkait menjawab galat yang jelas dan sisanya tetap berjalan.
