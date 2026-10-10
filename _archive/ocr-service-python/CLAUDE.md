# OCR service (Python FastAPI)

Acuan: `docs/PRD.md` (terutama Bagian 11, 17, 19). Baca juga `../CLAUDE.md`.

## Struktur
- `app/main.py`: rute `/ocr/akta`, `/ocr/kk`, `/ocr/rapor`, `/health`.
- `app/engines/`: satu file per engine, semua memenuhi Protocol `OcrEngine` di `base.py`. Engine hanya mengembalikan kata + bounding box + skor.
- `app/parsers/`: `akta.py`, `kk.py`, `rapor.py`. Parser tidak boleh tahu engine apa yang dipakai.
- `app/pdf_text.py`: ekstraksi teks PDF digital tanpa OCR (dicoba lebih dulu).
- `benchmark/`: skrip uji engine. Dataset dan ground truth tidak di-commit. Tidak jalan di CI.

## Aturan wajib
- Engine OCR belum ditetapkan (keputusan D1, spike M5a). Jangan memilih engine tanpa ADR `docs/adr/0002-engine-ocr.md`.
- Layanan hanya di jaringan internal Docker, dilindungi header `X-OCR-Token`. Tanpa CORS publik.
- Gambar diproses di memori, tidak disimpan. Teks mentah OCR dan data pribadi tidak masuk log.
- Parser tidak menebak: field ragu = MEDIUM/LOW, bukan HIGH.
- Konfigurasi dari env (`OCR_ENGINE`, `OCR_ENGINE_RAPOR`, `OCR_SERVICE_TOKEN`). Rahasia tidak di-commit.

## Testing
- pytest dengan fixture hasil engine (JSON kata + bbox), tidak bergantung engine.
- Sebelum selesai: `ruff check .` dan `pytest` hijau.
