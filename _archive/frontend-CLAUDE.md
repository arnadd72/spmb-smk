# Frontend (Next.js + React + TypeScript)

Acuan: `docs/PRD.md` (terutama Bagian 6, 10, 13, 14, 16, 19). Baca juga `../CLAUDE.md`.

## Struktur
- Kode dikelompokkan per fitur di `src/features/<fitur>/{components,hooks,api.ts,schema.ts}`.
- `src/components/ui` tidak boleh mengimpor dari `src/features`. Komponen > 200 baris dipecah.
- Tipe API di `src/types/` di-generate dari `docs/api/openapi.yaml` (`npm run gen:types`), jangan ditulis tangan.
- Route group: `(publik)`, `(daftar)`, `(admin)`.

## Aturan wajib
- Validasi frontend hanya kenyamanan. Validasi otoritatif ada di backend.
- Tidak ada data pribadi di `localStorage`/`sessionStorage` (Bagian 10.4). Draf ada di server.
- Browser tidak pernah memegang kunci Supabase atau token Google.
- Animasi: Motion (`motion/react`) untuk UI/wizard. GSAP hanya di route publik, dimuat dinamis, dan tidak boleh ada di wizard atau admin (16.5).
- Semua animasi menghormati `prefers-reduced-motion`. Hanya animasikan `transform` dan `opacity`.
- Ikon: hanya `@phosphor-icons/react`. Font maksimal dua keluarga (Bricolage Grotesque, Plus Jakarta Sans).
- Desain: ikuti 16.2-16.4 dan `docs/design/DESIGN.md`. Dilarang tampilan default shadcn/ui, glassmorphism massal, hero tengah template, em-dash dekoratif, statistik palsu.
- Mobile-first, diuji di 360/768/1024/1440 px. Target sentuh >= 44 px. Teks UI berbahasa Indonesia.
- Skill desain yang bertentangan dengan PRD kalah.

## Testing
- Vitest + Testing Library untuk komponen, Playwright untuk E2E (viewport 360 dan 1440).
- Sebelum selesai: `npm run lint`, `npm run typecheck`, `npm test` hijau.
