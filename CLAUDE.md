# SPMB SMK Ma'arif NU 1 Wangon v4

Satu aplikasi Next.js full-stack (Vercel, Prisma, Postgres). Tidak ada lagi Laravel, Python, atau Docker produksi.

## Sumber kebenaran
- Baca `docs/PRD.md` (v4) seluruhnya sebelum mengerjakan apa pun, termasuk bila Anda agen baru.
- PRD v4 sering merujuk "v3.1 Bagian X": isinya ada di `docs/arsip/PRD-v3.1.md`. Rujukan itu tetap berlaku
  kecuali PRD v4 menyatakan lain.
- Jangan menambah fitur, library, atau mengubah arsitektur di luar PRD tanpa bertanya. Keputusan baru:
  perbarui `docs/PRD.md` dulu, di commit yang sama dengan kodenya.
- Sesi bisa berpindah ke agen lain. Semua keputusan harus tercermin di `docs/PRD.md` dan `git log`,
  bukan hanya di percakapan.

## Cara kerja
- Ikuti roadmap Bagian 20 PRD. Fase A (fitur dan tampilan, layanan lokal) dulu, Fase B (produksi) belakangan.
  Kerjakan satu milestone, commit saat selesai dengan pesan yang menyebut milestone dan alasannya.
- Untuk tugas besar: buat rencana, tunggu persetujuan, baru eksekusi.
- Setiap fitur wajib punya test (Bagian 19) dan test harus hijau sebelum milestone dinyatakan selesai.
- Bagian 15.1 (PDF formulir) sudah selesai (`src/server/services/pdf`). Hasil harus tetap identik dengan `docs/template-formulir.docx`; jangan menggambar ulang lapisan tetapnya.
- Kerja lama ada di `_archive/` (Laravel, OCR Python, Docker). Hanya acuan konsep, bukan kode aktif.
  Jangan diubah, jangan diimpor.

## Struktur dan batas lapisan (PRD 6.4)
- `src/app/`: tampilan dan route API (`src/app/api/v1/*`).
- `src/server/`: SEMUA logic backend (db, auth, actions, services, validasi). Hanya di sini yang boleh bicara
  ke Prisma, Google Drive, Supabase, Resend. OCR berjalan di browser (`src/lib/ocr`), bukan di server.
- `src/components`, `src/features`, `src/lib`, `src/styles`: sisi klien. Jangan impor dari `src/server`, kecuali modul validasi murni (`src/server/validasi`, `src/server/types`) lewat `schema-client.ts` per fitur.
  Arah satu jalur: UI -> route handler (`src/app/api`) -> `src/server`. Server Component membaca data lewat
  fungsi `src/server` secara langsung; komponen klien lewat `apiFetch` ke `/api/v1`.
- `src/server` tidak mengimpor dari `src/app` atau `src/components`. Service tidak tahu soal HTTP.
- Satu skema Zod per entitas di `src/server/validasi/`, dipakai server (otoritatif) dan form klien.
- `src/components/ui` tidak boleh mengimpor dari `src/features`.

## Aturan penting
- Bahasa antarmuka: Bahasa Indonesia.
- Rahasia (password, API key, token) tidak pernah ditulis ke file yang di-commit. Pakai `.env` lokal dan
  perbarui `.env.example` setiap menambah variabel.
- Desain mengikuti Bagian 16 PRD dan `docs/design/DESIGN.md`, termasuk larangan anti AI slop (16.4).
  Bila skill desain bertentangan dengan PRD, PRD yang menang.
- Siswa tidak login. Fitur cerdas hanya dua: OCR (PaddleOCR di browser pendaftar, PRD Bagian 11) dan cadangan jawaban Tanya Panitia lewat Gemini (hanya bila FAQ tidak cocok, atas permintaan pemilik proyek; PRD 1.3 butir 36).
- Dokumen pendaftar disimpan di Google Drive lewat `PenyimpananDokumen`, tidak pernah punya URL publik.
- Data sensitif (NIK, no KK, no HP) dienkripsi eksplisit di `src/server/services/kripto.ts`.
- Jangan mengulang bug v1 dan temuan audit (`docs/arsip/PRD-v3.1.md` Bagian 18, PRD v4 Bagian 18).
- Next.js 16 punya perubahan besar. Baca docs di `node_modules/next/dist/docs/` sebelum memakai API Next.
  `middleware.ts` sekarang bernama `proxy.ts`. Lihat `AGENTS.md`.

## Perintah umum
- Dev: `npm run dev`. Postgres lokal tanpa Docker: `npm run db:start` (lihat README). Docker opsional.
- Cek: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`.
- E2E memakai database lokal `spmb_test` dan server sendiri di port 3100 (`.env.test`, tidak di-commit), bukan Supabase,
  jadi aman dijalankan saat `npm run dev` terhubung ke Supabase. Pertama kali: `npm run db:start` lalu `npm run db:test:siapkan`.
  Playwright menolak jalan bila `DATABASE_URL` bukan Postgres lokal berakhiran `_test`. Contoh isi `.env.test` ada di `.env.example`.
- Prisma: `npm run db:migrate`, `npm run db:seed`.
