# SPMB SMK Ma'arif NU 1 Wangon v3

## Sumber kebenaran
- Baca `docs/PRD.md` sebelum mengerjakan apa pun. PRD adalah acuan fitur,
  skema data, API, struktur folder, dan aturan desain.
- Jangan menambah fitur, library, atau mengubah arsitektur di luar PRD tanpa
  bertanya dulu. Bila ada keputusan baru, perbarui `docs/PRD.md` dulu baru kode.

## Cara kerja
- Kerjakan satu milestone saja sesuai Bagian 20 PRD, sesuai yang diminta.
- Untuk tugas besar: buat rencana dulu, tunggu persetujuan, baru eksekusi.
- Setiap fitur wajib punya test (Bagian 19) dan test harus hijau sebelum selesai.
- Ikuti struktur monorepo di Bagian 6.4: `backend/` (Laravel API),
  `frontend/` (Next.js), `ocr-service/` (Python), `infra/`, `docs/`.
- Aturan per lapisan ada di `backend/CLAUDE.md`, `frontend/CLAUDE.md`, dan
  `ocr-service/CLAUDE.md`. Baca yang relevan sebelum mengubah lapisan itu.

## Aturan penting
- Bahasa antarmuka: Bahasa Indonesia.
- Jangan pernah menulis rahasia (password, API key, token) ke file yang
  di-commit. Pakai `.env` dan sediakan `.env.example`.
- Desain mengikuti Bagian 16 PRD, termasuk larangan anti AI slop (16.4).
  Bila skill desain bertentangan dengan PRD, PRD yang menang.
- Dokumen pendaftar disimpan di Google Drive lewat `PenyimpananDokumen`,
  tidak pernah punya URL publik (Bagian 7.5).
- Siswa tidak login. OCR adalah satu-satunya fitur cerdas (Bagian 1).
- Jangan mengulang bug v1 dan temuan audit di Bagian 18.

## Perintah umum
- Dev: `docker compose -f infra/docker-compose.dev.yml up -d` (Postgres, backend, frontend, ocr, queue).
- Backend: `cd backend && composer test` / `composer lint` / `composer analyse`.
- Frontend: `cd frontend && npm run lint && npm run typecheck && npm test`.
- OCR: `cd ocr-service && ruff check . && pytest`.
