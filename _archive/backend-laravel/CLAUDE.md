# Backend (Laravel 13, API only)

Acuan: `docs/PRD.md` (terutama Bagian 6, 7, 8, 9, 12, 17, 19). Baca juga `../CLAUDE.md`.

## Struktur dan tanggung jawab
- Controller tipis. Logika di `app/Actions/` (satu kelas = satu use case) dan `app/Services/`.
- Validasi di `FormRequest`. Output lewat `JsonResource`. Tidak ada query di controller selain pemanggilan sederhana.
- Blade hanya untuk PDF dan email (`resources/views/{pdf,mail}`).
- Status memakai `string` + PHP Enum di `app/Enums/`, bukan `enum()` database.
- Satu migrasi per tabel, bentuk final (Bagian 8). Migrasi terakhir mengaktifkan RLS (7.4).

## Aturan wajib
- Semua route `/api/v1/admin/*` memakai Sanctum + Policy/Gate. Tidak boleh ada route admin tanpa test 401.
- Dokumen pendaftar hanya lewat interface `PenyimpananDokumen` (driver `google_drive`, `lokal`). Jangan panggil Google Drive atau `Storage` langsung dari controller/action.
- Dokumen tidak pernah punya URL publik. Admin melihat lewat proxy yang mencatat audit log.
- Token publik (draf, sukses, formulir) disimpan sebagai hash SHA-256. Jangan simpan token mentah.
- SQL kompatibel Postgres: `EXTRACT`, `ilike`, `jsonb`. Tanpa `SUBSTR` gaya SQLite/MySQL.
- Kegagalan OCR, Drive, atau email tidak boleh menggagalkan pendaftaran.
- Jangan log data pribadi (NIK, nama, teks OCR mentah).
- Rahasia hanya di `.env`; perbarui `.env.example` setiap menambah variabel.

## Testing
- PHPUnit di Postgres lokal (Docker), bukan SQLite. Pakai `Storage::fake`, `Mail::fake`, `Queue::fake`, `Http::fake`.
- Driver `lokal` dipakai di test; `GoogleDriveDokumen` diuji dengan klien Google yang di-mock.
- Sebelum selesai: `composer lint`, `composer analyse`, `composer test` hijau.
